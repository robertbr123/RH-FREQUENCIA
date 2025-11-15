import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ==================== CARGOS ====================

// Listar cargos
router.get('/positions', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM positions ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar cargos:', error);
    res.status(500).json({ error: 'Erro ao buscar cargos' });
  }
});

// Criar cargo
router.post('/positions', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO positions (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar cargo:', error);
    res.status(500).json({ error: 'Erro ao criar cargo' });
  }
});

// Atualizar cargo
router.put('/positions/:id', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE positions SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar cargo:', error);
    res.status(500).json({ error: 'Erro ao atualizar cargo' });
  }
});

// Deletar cargo
router.delete('/positions/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM positions WHERE id = $1', [req.params.id]);
    res.json({ message: 'Cargo deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar cargo:', error);
    res.status(500).json({ error: 'Erro ao deletar cargo' });
  }
});

// ==================== DEPARTAMENTOS ====================

// Listar departamentos
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM departments ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar departamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar departamentos' });
  }
});

// Criar departamento
router.post('/departments', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO departments (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar departamento:', error);
    res.status(500).json({ error: 'Erro ao criar departamento' });
  }
});

// Atualizar departamento
router.put('/departments/:id', authenticateToken, async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE departments SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar departamento:', error);
    res.status(500).json({ error: 'Erro ao atualizar departamento' });
  }
});

// Deletar departamento
router.delete('/departments/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM departments WHERE id = $1', [req.params.id]);
    res.json({ message: 'Departamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar departamento:', error);
    res.status(500).json({ error: 'Erro ao deletar departamento' });
  }
});

// ==================== SETORES ====================

// Listar setores
router.get('/sectors', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, d.name as department_name 
       FROM sectors s 
       LEFT JOIN departments d ON s.department_id = d.id 
       ORDER BY s.name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar setores:', error);
    res.status(500).json({ error: 'Erro ao buscar setores' });
  }
});

// Criar setor
router.post('/sectors', authenticateToken, async (req, res) => {
  const { name, description, department_id } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sectors (name, description, department_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description, department_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar setor:', error);
    res.status(500).json({ error: 'Erro ao criar setor' });
  }
});

// Atualizar setor
router.put('/sectors/:id', authenticateToken, async (req, res) => {
  const { name, description, department_id } = req.body;
  try {
    const result = await pool.query(
      'UPDATE sectors SET name = $1, description = $2, department_id = $3 WHERE id = $4 RETURNING *',
      [name, description, department_id, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar setor:', error);
    res.status(500).json({ error: 'Erro ao atualizar setor' });
  }
});

// Deletar setor
router.delete('/sectors/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM sectors WHERE id = $1', [req.params.id]);
    res.json({ message: 'Setor deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar setor:', error);
    res.status(500).json({ error: 'Erro ao deletar setor' });
  }
});

// ==================== HORÁRIOS ====================

// Listar horários
router.get('/schedules', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM schedules ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar horários:', error);
    res.status(500).json({ error: 'Erro ao buscar horários' });
  }
});

// Criar horário
router.post('/schedules', authenticateToken, async (req, res) => {
  const { name, start_time, end_time, break_start, break_end, workdays } = req.body;
  try {
    // Converter workdays para JSON se for array
    const workdaysJson = Array.isArray(workdays) ? JSON.stringify(workdays) : workdays;
    
    const result = await pool.query(
      `INSERT INTO schedules (name, start_time, end_time, break_start, break_end, workdays) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, start_time, end_time, break_start || null, break_end || null, workdaysJson]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar horário:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar horário' });
  }
});

// Atualizar horário
router.put('/schedules/:id', authenticateToken, async (req, res) => {
  const { name, start_time, end_time, break_start, break_end, workdays } = req.body;
  try {
    // Converter workdays para JSON se for array
    const workdaysJson = Array.isArray(workdays) ? JSON.stringify(workdays) : workdays;
    
    const result = await pool.query(
      `UPDATE schedules 
       SET name = $1, start_time = $2, end_time = $3, break_start = $4, break_end = $5, workdays = $6 
       WHERE id = $7 RETURNING *`,
      [name, start_time, end_time, break_start || null, break_end || null, workdaysJson, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar horário:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar horário' });
  }
});

// Deletar horário
router.delete('/schedules/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
    res.json({ message: 'Horário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar horário:', error);
    res.status(500).json({ error: 'Erro ao deletar horário' });
  }
});

// ==================== FERIADOS ====================

// Listar feriados
router.get('/holidays', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM holidays ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar feriados:', error);
    res.status(500).json({ error: 'Erro ao buscar feriados' });
  }
});

// Criar feriado
router.post('/holidays', authenticateToken, async (req, res) => {
  const { name, date, type, description, recurring } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO holidays (name, date, type, description, recurring) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, date, type, description || null, recurring || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar feriado:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar feriado' });
  }
});

// Atualizar feriado
router.put('/holidays/:id', authenticateToken, async (req, res) => {
  const { name, date, type, description, recurring } = req.body;
  try {
    const result = await pool.query(
      `UPDATE holidays 
       SET name = $1, date = $2, type = $3, description = $4, recurring = $5 
       WHERE id = $6 RETURNING *`,
      [name, date, type, description || null, recurring || false, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar feriado:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar feriado' });
  }
});

// Deletar feriado
router.delete('/holidays/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM holidays WHERE id = $1', [req.params.id]);
    res.json({ message: 'Feriado deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar feriado:', error);
    res.status(500).json({ error: 'Erro ao deletar feriado' });
  }
});

// ==================== FÉRIAS ====================

// Listar todas as férias
router.get('/vacations', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    let query = `
      SELECT 
        v.*,
        e.name as employee_name,
        e.photo_url,
        p.name as position_name
      FROM employee_vacations v
      JOIN employees e ON v.employee_id = e.id
      LEFT JOIN positions p ON e.position_id = p.id
    `;
    
    const params = [];
    if (year) {
      query += ' WHERE v.year = $1';
      params.push(year);
    }
    
    query += ' ORDER BY v.month ASC, v.start_date ASC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar férias:', error);
    res.status(500).json({ error: 'Erro ao buscar férias' });
  }
});

// Buscar férias por mês específico
router.get('/vacations/month/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const result = await pool.query(
      `SELECT 
        v.*,
        e.name as employee_name,
        e.photo_url,
        p.name as position_name
      FROM employee_vacations v
      JOIN employees e ON v.employee_id = e.id
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE v.year = $1 AND v.month = $2
      ORDER BY v.start_date ASC`,
      [year, month]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar férias do mês:', error);
    res.status(500).json({ error: 'Erro ao buscar férias do mês' });
  }
});

// Criar férias
router.post('/vacations', authenticateToken, async (req, res) => {
  const { employee_id, year, month, start_date, end_date, days, notes } = req.body;
  
  try {
    // Verificar se já existe férias para este funcionário neste mês/ano
    const existing = await pool.query(
      'SELECT id FROM employee_vacations WHERE employee_id = $1 AND year = $2 AND month = $3',
      [employee_id, year, month]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Este funcionário já possui férias cadastradas para este mês/ano' 
      });
    }
    
    const result = await pool.query(
      `INSERT INTO employee_vacations 
       (employee_id, year, month, start_date, end_date, days, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [employee_id, year, month, start_date, end_date, days, notes || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar férias:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar férias' });
  }
});

// Atualizar férias
router.put('/vacations/:id', authenticateToken, async (req, res) => {
  const { employee_id, year, month, start_date, end_date, days, notes } = req.body;
  
  try {
    // Verificar se já existe outra férias para este funcionário neste mês/ano
    const existing = await pool.query(
      'SELECT id FROM employee_vacations WHERE employee_id = $1 AND year = $2 AND month = $3 AND id != $4',
      [employee_id, year, month, req.params.id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Este funcionário já possui férias cadastradas para este mês/ano' 
      });
    }
    
    const result = await pool.query(
      `UPDATE employee_vacations 
       SET employee_id = $1, year = $2, month = $3, start_date = $4, 
           end_date = $5, days = $6, notes = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [employee_id, year, month, start_date, end_date, days, notes || null, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar férias:', error);
    res.status(500).json({ error: error.message || 'Erro ao atualizar férias' });
  }
});

// Deletar férias
router.delete('/vacations/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM employee_vacations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Férias deletadas com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar férias:', error);
    res.status(500).json({ error: 'Erro ao deletar férias' });
  }
});

export default router;
