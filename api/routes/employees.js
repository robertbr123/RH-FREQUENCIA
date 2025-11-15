import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar todos os funcionários
router.get('/', authenticateToken, async (req, res) => {
  const { status } = req.query;
  
  try {
    let query = `SELECT e.*, 
                        p.name as position_name,
                        d.name as department_name,
                        s.name as sector_name,
                        u.name as unit_name
                 FROM employees e
                 LEFT JOIN positions p ON e.position_id = p.id
                 LEFT JOIN departments d ON e.department_id = d.id
                 LEFT JOIN sectors s ON e.sector_id = s.id
                 LEFT JOIN units u ON e.unit_id = u.id`;
    const params = [];

    if (status) {
      query += ' WHERE e.status = $1';
      params.push(status);
    }

    query += ' ORDER BY e.name ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar funcionários:', error);
    res.status(500).json({ error: 'Erro ao buscar funcionários' });
  }
});

// Buscar funcionário por ID
router.get('/:id', authenticateToken, async (req, res) => {
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

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar funcionário:', error);
    res.status(500).json({ error: 'Erro ao buscar funcionário' });
  }
});

// Criar novo funcionário
router.post('/', authenticateToken, async (req, res) => {
  const { 
    name, email, cpf, rg, birth_date, gender, marital_status,
    address, city, state, zip_code, phone, emergency_contact, emergency_phone,
    position_id, department_id, sector_id, schedule_id, unit_id,
    photo_url, status, hire_date, salary, bank_name, bank_account, pis
  } = req.body;

  try {
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
    console.error('Erro ao criar funcionário:', error);
    res.status(400).json({ error: error.message || 'Erro ao criar funcionário' });
  }
});

// Atualizar funcionário
router.put('/:id', authenticateToken, async (req, res) => {
  const { 
    name, email, cpf, rg, birth_date, gender, marital_status,
    address, city, state, zip_code, phone, emergency_contact, emergency_phone,
    position_id, department_id, sector_id, schedule_id, unit_id,
    photo_url, status, hire_date, salary, bank_name, bank_account, pis
  } = req.body;

  try {
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
    console.error('Erro ao atualizar funcionário:', error);
    res.status(400).json({ error: error.message || 'Erro ao atualizar funcionário' });
  }
});

// Deletar funcionário (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE employees SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      ['inactive', req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json({ message: 'Funcionário desativado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar funcionário:', error);
    res.status(500).json({ error: 'Erro ao deletar funcionário' });
  }
});

export default router;
