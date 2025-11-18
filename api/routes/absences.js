import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar ausências de um funcionário
router.get('/employee/:employeeId', authenticateToken, async (req, res) => {
  const { employeeId } = req.params;
  const { start_date, end_date } = req.query;

  try {
    let query = `
      SELECT a.*, e.name as employee_name, u.username as created_by_name
      FROM employee_absences a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.employee_id = $1
    `;
    
    const params = [employeeId];
    
    if (start_date && end_date) {
      query += ` AND (
        (a.start_date BETWEEN $2 AND $3) OR 
        (a.end_date BETWEEN $2 AND $3) OR
        (a.start_date <= $2 AND a.end_date >= $3)
      )`;
      params.push(start_date, end_date);
    }
    
    query += ` ORDER BY a.start_date DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar ausências:', error);
    res.status(500).json({ error: 'Erro ao buscar ausências' });
  }
});

// Listar todas as ausências (com filtros opcionais)
router.get('/', authenticateToken, async (req, res) => {
  const { start_date, end_date, absence_type } = req.query;

  try {
    let query = `
      SELECT a.*, e.name as employee_name, e.position_id, p.name as position_name,
             u.username as created_by_name
      FROM employee_absences a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND (
        (a.start_date BETWEEN $${params.length - 1} AND $${params.length}) OR 
        (a.end_date BETWEEN $${params.length - 1} AND $${params.length}) OR
        (a.start_date <= $${params.length - 1} AND a.end_date >= $${params.length})
      )`;
    }
    
    if (absence_type) {
      params.push(absence_type);
      query += ` AND a.absence_type = $${params.length}`;
    }
    
    query += ` ORDER BY a.start_date DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar ausências:', error);
    res.status(500).json({ error: 'Erro ao buscar ausências' });
  }
});

// Criar nova ausência
router.post('/', authenticateToken, async (req, res) => {
  const { employee_id, start_date, end_date, absence_type, observation } = req.body;
  const userId = req.user.userId;

  try {
    // Validar campos obrigatórios
    if (!employee_id || !start_date || !end_date || !absence_type) {
      return res.status(400).json({ error: 'Campos obrigatórios: employee_id, start_date, end_date, absence_type' });
    }

    // Validar datas
    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ error: 'Data final não pode ser menor que data inicial' });
    }

    // Verificar se há sobreposição de ausências
    const overlap = await pool.query(
      `SELECT id FROM employee_absences 
       WHERE employee_id = $1 
       AND (
         (start_date BETWEEN $2 AND $3) OR 
         (end_date BETWEEN $2 AND $3) OR
         (start_date <= $2 AND end_date >= $3)
       )`,
      [employee_id, start_date, end_date]
    );

    if (overlap.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Já existe uma ausência registrada neste período' 
      });
    }

    // Inserir ausência
    const result = await pool.query(
      `INSERT INTO employee_absences 
       (employee_id, start_date, end_date, absence_type, observation, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [employee_id, start_date, end_date, absence_type, observation, userId]
    );

    res.json({ success: true, absence: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar ausência:', error);
    res.status(500).json({ error: 'Erro ao criar ausência' });
  }
});

// Atualizar ausência
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date, absence_type, observation } = req.body;

  try {
    // Validar datas
    if (end_date && start_date && new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ error: 'Data final não pode ser menor que data inicial' });
    }

    const result = await pool.query(
      `UPDATE employee_absences 
       SET start_date = COALESCE($1, start_date),
           end_date = COALESCE($2, end_date),
           absence_type = COALESCE($3, absence_type),
           observation = COALESCE($4, observation)
       WHERE id = $5
       RETURNING *`,
      [start_date, end_date, absence_type, observation, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ausência não encontrada' });
    }

    res.json({ success: true, absence: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar ausência:', error);
    res.status(500).json({ error: 'Erro ao atualizar ausência' });
  }
});

// Deletar ausência
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM employee_absences WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ausência não encontrada' });
    }

    res.json({ success: true, message: 'Ausência excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir ausência:', error);
    res.status(500).json({ error: 'Erro ao excluir ausência' });
  }
});

// Verificar se um funcionário tem ausência em uma data específica
router.get('/check/:employeeId/:date', authenticateToken, async (req, res) => {
  const { employeeId, date } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM employee_absences 
       WHERE employee_id = $1 
       AND $2 BETWEEN start_date AND end_date`,
      [employeeId, date]
    );

    res.json({ 
      hasAbsence: result.rows.length > 0,
      absence: result.rows[0] || null
    });
  } catch (error) {
    console.error('Erro ao verificar ausência:', error);
    res.status(500).json({ error: 'Erro ao verificar ausência' });
  }
});

export default router;
