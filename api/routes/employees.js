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

    // Construir query base
    let baseQuery = `SELECT e.*, 
                        p.name as position_name,
                        d.name as department_name,
                        s.name as sector_name,
                        u.name as unit_name
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
              u.name as unit_name
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

export default router;
