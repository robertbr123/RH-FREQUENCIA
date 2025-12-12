import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkDepartmentAccess, hasAccessToEmployee } from '../middleware/departmentAccess.js';
import cache, { CACHE_KEYS, CACHE_TTL } from '../utils/cache.js';
import { getPaginationParams, formatPaginatedResponse, getSearchParams, getSortParams } from '../utils/pagination.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Campos permitidos para ordenação
const ALLOWED_SORT_FIELDS = ['name', 'email', 'hire_date', 'department_name', 'position_name', 'created_at'];

// Listar funcionários com paginação, busca e cache
router.get('/', authenticateToken, checkDepartmentAccess, async (req, res) => {
  const { status, paginate } = req.query;
  
  try {
    // Parâmetros de paginação (opcional - mantém retrocompatibilidade)
    const usePagination = paginate === 'true' || req.query.page || req.query.limit;
    const pagination = usePagination ? getPaginationParams(req.query, { limit: 50 }) : null;
    
    // Parâmetros de ordenação
    const sort = getSortParams(req.query, ALLOWED_SORT_FIELDS, 'name', 'ASC');
    
    // Parâmetros de busca
    const search = getSearchParams(req.query, ['e.name', 'e.email', 'e.cpf']);

    // Construir query base - inclui contagem de departamentos e arrays
    let baseQuery = `SELECT e.*, 
                        p.name as position_name,
                        d.name as department_name,
                        s.name as sector_name,
                        u.name as unit_name,
                        COALESCE((SELECT COUNT(*) FROM employee_departments ed WHERE ed.employee_id = e.id), 0) as departments_count,
                        COALESCE(
                          (SELECT array_agg(DISTINCT ed.department_id) 
                           FROM employee_departments ed 
                           WHERE ed.employee_id = e.id),
                          ARRAY[e.department_id]
                        ) as all_department_ids,
                        COALESCE(
                          (SELECT array_agg(DISTINCT dept.name) 
                           FROM employee_departments ed 
                           JOIN departments dept ON ed.department_id = dept.id
                           WHERE ed.employee_id = e.id),
                          ARRAY[d.name]
                        ) as all_department_names
                 FROM employees e
                 LEFT JOIN positions p ON e.position_id = p.id
                 LEFT JOIN departments d ON e.department_id = d.id
                 LEFT JOIN sectors s ON e.sector_id = s.id
                 LEFT JOIN units u ON e.unit_id = u.id`;
    
    const conditions = [];
    const params = [];
    let paramCount = 1;

    // Filtro por departamento (gestor)
    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      conditions.push(`e.department_id = ANY($${paramCount})`);
      params.push(deptIds);
      paramCount++;
    }

    // Filtro por status
    if (status) {
      conditions.push(`e.status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    // Filtro de busca
    if (search) {
      const searchConditions = ['e.name', 'e.email', 'e.cpf'].map(() => {
        const condition = `LOWER(COALESCE(e.name, '')) LIKE LOWER($${paramCount}) OR LOWER(COALESCE(e.email, '')) LIKE LOWER($${paramCount}) OR LOWER(COALESCE(e.cpf, '')) LIKE LOWER($${paramCount})`;
        return condition;
      });
      conditions.push(`(${searchConditions[0]})`);
      params.push(`%${search.term}%`);
      paramCount++;
    }

    // Montar WHERE
    if (conditions.length > 0) {
      baseQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Se usar paginação
    if (usePagination) {
      // Query de contagem
      const countQuery = `SELECT COUNT(*) as total FROM employees e
                          LEFT JOIN departments d ON e.department_id = d.id
                          ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`;
      
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      // Query com paginação
      const dataQuery = `${baseQuery} ${sort.sql} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      const dataParams = [...params, pagination.limit, pagination.offset];
      
      const result = await pool.query(dataQuery, dataParams);
      
      return res.json(formatPaginatedResponse(result.rows, total, pagination));
    }

    // Sem paginação (retrocompatibilidade)
    baseQuery += ` ${sort.sql}`;
    const result = await pool.query(baseQuery, params);
    res.json(result.rows);
    
  } catch (error) {
    logger.error('Erro ao buscar funcionários', error);
    res.status(500).json({ error: 'Erro ao buscar funcionários' });
  }
});

// Buscar funcionário por ID (com validação de departamento)
router.get('/:id', authenticateToken, checkDepartmentAccess, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, 
              p.name as position_name,
              d.name as department_name,
              s.name as sector_name,
              u.name as unit_name,
              COALESCE(
                (SELECT array_agg(DISTINCT ed.department_id) 
                 FROM employee_departments ed 
                 WHERE ed.employee_id = e.id),
                ARRAY[e.department_id]
              ) as all_department_ids,
              COALESCE(
                (SELECT array_agg(DISTINCT dept.name) 
                 FROM employee_departments ed 
                 JOIN departments dept ON ed.department_id = dept.id
                 WHERE ed.employee_id = e.id),
                ARRAY[d.name]
              ) as all_department_names
       FROM employees e
       LEFT JOIN positions p ON e.position_id = p.id
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN sectors s ON e.sector_id = s.id
       LEFT JOIN units u ON e.unit_id = u.id
       WHERE e.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const employee = result.rows[0];

    // Validar acesso (gestor só vê seus departamentos)
    const deptIds = req.userDepartmentIds || [req.userDepartmentId];
    const hasAccess = await hasAccessToEmployee(
      employee.department_id,
      req.user.role,
      deptIds
    );

    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado a este funcionário' });
    }

    res.json(employee);
  } catch (error) {
    logger.error('Erro ao buscar funcionário', error);
    res.status(500).json({ error: 'Erro ao buscar funcionário' });
  }
});

// Criar novo funcionário
router.post('/', authenticateToken, checkDepartmentAccess, async (req, res) => {
  const { 
    name, email, cpf, rg, birth_date, gender, marital_status,
    address, city, state, zip_code, phone, emergency_contact, emergency_phone,
    position_id, department_id, sector_id, schedule_id, unit_id,
    photo_url, status, hire_date, salary, bank_name, bank_account, pis
  } = req.body;

  try {
    // Validar acesso ao departamento (gestor pode criar em qualquer um dos seus departamentos)
    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      if (!deptIds.includes(department_id)) {
        return res.status(403).json({ 
          error: 'Você só pode criar funcionários nos seus departamentos' 
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO employees (
        name, email, cpf, rg, birth_date, gender, marital_status,
        address, city, state, zip_code, phone, emergency_contact, emergency_phone,
        position_id, department_id, sector_id, schedule_id, unit_id,
        photo_url, status, hire_date, salary, bank_name, bank_account, pis
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
       RETURNING *`,
      [
        name, email, cpf, rg, birth_date, gender, marital_status,
        address, city, state, zip_code, phone, emergency_contact, emergency_phone,
        position_id, department_id, sector_id, schedule_id, unit_id,
        photo_url, status || 'active', hire_date, salary, bank_name, bank_account, pis
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email ou CPF já cadastrado' });
    }
    logger.error('Erro ao criar funcionário', error);
    res.status(400).json({ error: error.message || 'Erro ao criar funcionário' });
  }
});

// Atualizar funcionário
router.put('/:id', authenticateToken, checkDepartmentAccess, async (req, res) => {
  const { 
    name, email, cpf, rg, birth_date, gender, marital_status,
    address, city, state, zip_code, phone, emergency_contact, emergency_phone,
    position_id, department_id, sector_id, schedule_id, unit_id,
    photo_url, status, hire_date, salary, bank_name, bank_account, pis
  } = req.body;

  try {
    // Primeiro, verificar se funcionário existe e se tem acesso
    const employeeCheck = await pool.query(
      'SELECT department_id FROM employees WHERE id = $1',
      [req.params.id]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const employeeDepartmentId = employeeCheck.rows[0].department_id;

    // Validar acesso (gestor pode gerenciar funcionários dos seus departamentos)
    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      if (!deptIds.includes(employeeDepartmentId)) {
        return res.status(403).json({ error: 'Acesso negado a este funcionário' });
      }
      // Gestor pode mover funcionário entre seus departamentos
      if (department_id && !deptIds.includes(department_id)) {
        return res.status(403).json({ 
          error: 'Você só pode mover funcionários para departamentos que você gerencia' 
        });
      }
    }

    const result = await pool.query(
      `UPDATE employees 
       SET name = $1, email = $2, cpf = $3, rg = $4, birth_date = $5, gender = $6, marital_status = $7,
           address = $8, city = $9, state = $10, zip_code = $11, phone = $12, 
           emergency_contact = $13, emergency_phone = $14,
           position_id = $15, department_id = $16, sector_id = $17, schedule_id = $18, unit_id = $19,
           photo_url = $20, status = $21, hire_date = $22, salary = $23, 
           bank_name = $24, bank_account = $25, pis = $26, updated_at = CURRENT_TIMESTAMP
       WHERE id = $27
       RETURNING *`,
      [
        name, email, cpf, rg, birth_date, gender, marital_status,
        address, city, state, zip_code, phone, emergency_contact, emergency_phone,
        position_id, department_id, sector_id, schedule_id, unit_id,
        photo_url, status, hire_date, salary, bank_name, bank_account, pis,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email ou CPF já cadastrado' });
    }
    logger.error('Erro ao atualizar funcionário', error);
    res.status(400).json({ error: error.message || 'Erro ao atualizar funcionário' });
  }
});

// Deletar funcionário (soft delete)
router.delete('/:id', authenticateToken, checkDepartmentAccess, async (req, res) => {
  try {
    // Verificar acesso
    const employeeCheck = await pool.query(
      'SELECT department_id FROM employees WHERE id = $1',
      [req.params.id]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      if (!deptIds.includes(employeeCheck.rows[0].department_id)) {
        return res.status(403).json({ error: 'Acesso negado a este funcionário' });
      }
    }

    const result = await pool.query(
      'UPDATE employees SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      ['inactive', req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json({ message: 'Funcionário desativado com sucesso' });
  } catch (error) {
    logger.error('Erro ao deletar funcionário', error);
    res.status(500).json({ error: 'Erro ao deletar funcionário' });
  }
});

// Upload de foto do funcionário
router.post('/:id/photo', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { photo } = req.body; // base64 string

  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem fazer upload de fotos' });
    }

    if (!photo) {
      return res.status(400).json({ error: 'Foto é obrigatória' });
    }

    // Verificar se funcionário existe
    const employeeCheck = await pool.query(
      'SELECT id, name FROM employees WHERE id = $1',
      [id]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    // Salvar diretamente a base64 no banco (ou fazer upload para storage)
    // Para simplicidade, vamos salvar a base64 diretamente
    const photo_url = photo; // Em produção, fazer upload para S3/Cloudinary

    await pool.query(
      'UPDATE employees SET photo_url = $1 WHERE id = $2',
      [photo_url, id]
    );

    res.json({
      success: true,
      message: 'Foto atualizada com sucesso',
      photo_url: photo_url
    });
  } catch (error) {
    logger.error('Erro ao fazer upload de foto', error);
    res.status(500).json({ error: 'Erro ao fazer upload de foto' });
  }
});

// ==========================================
// ROTAS PARA MÚLTIPLOS DEPARTAMENTOS
// ==========================================

// Listar departamentos de um funcionário
router.get('/:id/departments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ed.*, 
              d.name as department_name,
              d.description as department_description,
              s.name as schedule_name,
              s.start_time,
              s.end_time,
              s.break_start,
              s.break_end,
              s.workdays
       FROM employee_departments ed
       LEFT JOIN departments d ON ed.department_id = d.id
       LEFT JOIN schedules s ON ed.schedule_id = s.id
       WHERE ed.employee_id = $1
       ORDER BY ed.is_primary DESC, d.name ASC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar departamentos do funcionário', error);
    res.status(500).json({ error: 'Erro ao buscar departamentos do funcionário' });
  }
});

// Adicionar funcionário a um departamento
router.post('/:id/departments', authenticateToken, async (req, res) => {
  const { department_id, schedule_id, is_primary, start_date, end_date, notes } = req.body;

  try {
    // Verificar se funcionário existe
    const employeeCheck = await pool.query(
      'SELECT id, name, department_id FROM employees WHERE id = $1',
      [req.params.id]
    );

    if (employeeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    // Validar acesso do gestor
    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      if (!deptIds.includes(department_id)) {
        return res.status(403).json({ 
          error: 'Você só pode adicionar funcionários aos seus departamentos' 
        });
      }
    }

    // Verificar se já existe esse vínculo
    const existingLink = await pool.query(
      'SELECT id FROM employee_departments WHERE employee_id = $1 AND department_id = $2',
      [req.params.id, department_id]
    );

    if (existingLink.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Funcionário já está vinculado a este departamento' 
      });
    }

    // Se for o primeiro departamento ou se is_primary for true, definir como principal
    const deptCount = await pool.query(
      'SELECT COUNT(*) as count FROM employee_departments WHERE employee_id = $1',
      [req.params.id]
    );
    const shouldBePrimary = is_primary || parseInt(deptCount.rows[0].count) === 0;

    // Inserir novo vínculo
    const result = await pool.query(
      `INSERT INTO employee_departments 
       (employee_id, department_id, schedule_id, is_primary, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.params.id, 
        department_id, 
        schedule_id || null, 
        shouldBePrimary, 
        start_date || new Date().toISOString().split('T')[0],
        end_date || null,
        notes || null
      ]
    );

    // Se for o departamento principal, atualizar também a tabela employees (retrocompatibilidade)
    if (shouldBePrimary) {
      await pool.query(
        'UPDATE employees SET department_id = $1, schedule_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [department_id, schedule_id, req.params.id]
      );
    }

    // Buscar dados completos para retorno
    const fullResult = await pool.query(
      `SELECT ed.*, 
              d.name as department_name,
              s.name as schedule_name
       FROM employee_departments ed
       LEFT JOIN departments d ON ed.department_id = d.id
       LEFT JOIN schedules s ON ed.schedule_id = s.id
       WHERE ed.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json(fullResult.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Funcionário já está neste departamento' });
    }
    logger.error('Erro ao adicionar departamento ao funcionário', error);
    res.status(500).json({ error: 'Erro ao adicionar departamento ao funcionário' });
  }
});

// Atualizar vínculo de departamento
router.put('/:id/departments/:deptLinkId', authenticateToken, async (req, res) => {
  const { schedule_id, is_primary, start_date, end_date, notes } = req.body;

  try {
    // Verificar se o vínculo existe
    const linkCheck = await pool.query(
      'SELECT * FROM employee_departments WHERE id = $1 AND employee_id = $2',
      [req.params.deptLinkId, req.params.id]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Vínculo não encontrado' });
    }

    const link = linkCheck.rows[0];

    // Validar acesso do gestor
    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      if (!deptIds.includes(link.department_id)) {
        return res.status(403).json({ error: 'Acesso negado a este departamento' });
      }
    }

    // Atualizar vínculo
    const result = await pool.query(
      `UPDATE employee_departments 
       SET schedule_id = $1, is_primary = $2, start_date = $3, end_date = $4, 
           notes = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        schedule_id !== undefined ? schedule_id : link.schedule_id,
        is_primary !== undefined ? is_primary : link.is_primary,
        start_date || link.start_date,
        end_date !== undefined ? end_date : link.end_date,
        notes !== undefined ? notes : link.notes,
        req.params.deptLinkId
      ]
    );

    // Se definido como principal, atualizar tabela employees (retrocompatibilidade)
    if (is_primary === true) {
      await pool.query(
        'UPDATE employees SET department_id = $1, schedule_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [link.department_id, schedule_id !== undefined ? schedule_id : link.schedule_id, req.params.id]
      );
    }

    // Buscar dados completos
    const fullResult = await pool.query(
      `SELECT ed.*, 
              d.name as department_name,
              s.name as schedule_name
       FROM employee_departments ed
       LEFT JOIN departments d ON ed.department_id = d.id
       LEFT JOIN schedules s ON ed.schedule_id = s.id
       WHERE ed.id = $1`,
      [result.rows[0].id]
    );

    res.json(fullResult.rows[0]);
  } catch (error) {
    logger.error('Erro ao atualizar vínculo de departamento', error);
    res.status(500).json({ error: 'Erro ao atualizar vínculo de departamento' });
  }
});

// Remover funcionário de um departamento
router.delete('/:id/departments/:deptLinkId', authenticateToken, async (req, res) => {
  try {
    // Verificar se o vínculo existe
    const linkCheck = await pool.query(
      'SELECT * FROM employee_departments WHERE id = $1 AND employee_id = $2',
      [req.params.deptLinkId, req.params.id]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Vínculo não encontrado' });
    }

    const link = linkCheck.rows[0];

    // Validar acesso do gestor
    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      if (!deptIds.includes(link.department_id)) {
        return res.status(403).json({ error: 'Acesso negado a este departamento' });
      }
    }

    // Não permitir remover se for o único departamento
    const deptCount = await pool.query(
      'SELECT COUNT(*) as count FROM employee_departments WHERE employee_id = $1',
      [req.params.id]
    );

    if (parseInt(deptCount.rows[0].count) <= 1) {
      return res.status(400).json({ 
        error: 'Não é possível remover o único departamento do funcionário' 
      });
    }

    // Deletar vínculo
    await pool.query(
      'DELETE FROM employee_departments WHERE id = $1',
      [req.params.deptLinkId]
    );

    // Se era o departamento principal, definir outro como principal
    if (link.is_primary) {
      const newPrimary = await pool.query(
        `UPDATE employee_departments 
         SET is_primary = true, updated_at = CURRENT_TIMESTAMP
         WHERE employee_id = $1 AND id != $2
         ORDER BY created_at ASC
         LIMIT 1
         RETURNING *`,
        [req.params.id, req.params.deptLinkId]
      );

      // Atualizar tabela employees com o novo departamento principal
      if (newPrimary.rows.length > 0) {
        await pool.query(
          'UPDATE employees SET department_id = $1, schedule_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
          [newPrimary.rows[0].department_id, newPrimary.rows[0].schedule_id, req.params.id]
        );
      }
    }

    res.json({ message: 'Funcionário removido do departamento com sucesso' });
  } catch (error) {
    logger.error('Erro ao remover funcionário do departamento', error);
    res.status(500).json({ error: 'Erro ao remover funcionário do departamento' });
  }
});

// Definir departamento como principal
router.put('/:id/departments/:deptLinkId/set-primary', authenticateToken, async (req, res) => {
  try {
    // Verificar se o vínculo existe
    const linkCheck = await pool.query(
      'SELECT * FROM employee_departments WHERE id = $1 AND employee_id = $2',
      [req.params.deptLinkId, req.params.id]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Vínculo não encontrado' });
    }

    const link = linkCheck.rows[0];

    // Remover flag is_primary de todos os outros
    await pool.query(
      'UPDATE employee_departments SET is_primary = false, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $1',
      [req.params.id]
    );

    // Definir este como principal
    await pool.query(
      'UPDATE employee_departments SET is_primary = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.deptLinkId]
    );

    // Atualizar tabela employees (retrocompatibilidade)
    await pool.query(
      'UPDATE employees SET department_id = $1, schedule_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [link.department_id, link.schedule_id, req.params.id]
    );

    res.json({ message: 'Departamento definido como principal' });
  } catch (error) {
    logger.error('Erro ao definir departamento principal', error);
    res.status(500).json({ error: 'Erro ao definir departamento principal' });
  }
});

// Buscar horário do funcionário por departamento (para registro de ponto)
router.get('/:id/schedule/:departmentId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ed.schedule_id, s.*
       FROM employee_departments ed
       LEFT JOIN schedules s ON ed.schedule_id = s.id
       WHERE ed.employee_id = $1 AND ed.department_id = $2`,
      [req.params.id, req.params.departmentId]
    );

    if (result.rows.length === 0) {
      // Fallback para schedule padrão do funcionário
      const fallback = await pool.query(
        `SELECT s.* FROM employees e
         LEFT JOIN schedules s ON e.schedule_id = s.id
         WHERE e.id = $1`,
        [req.params.id]
      );
      return res.json(fallback.rows[0] || null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao buscar horário do funcionário', error);
    res.status(500).json({ error: 'Erro ao buscar horário do funcionário' });
  }
});

export default router;
