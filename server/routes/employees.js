import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Listar todos os funcionários
router.get('/', authenticateToken, (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM employees';
  const params = [];

  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY name ASC';

  db.all(query, params, (err, employees) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar funcionários' });
    }
    res.json(employees);
  });
});

// Buscar funcionário por ID
router.get('/:id', authenticateToken, (req, res) => {
  db.get('SELECT * FROM employees WHERE id = ?', [req.params.id], (err, employee) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar funcionário' });
    }
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    res.json(employee);
  });
});

// Criar novo funcionário
router.post('/', authenticateToken, (req, res) => {
  const { name, email, cpf, position, department, phone, photo_url, hire_date } = req.body;

  db.run(
    `INSERT INTO employees (name, email, cpf, position, department, phone, photo_url, hire_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, email, cpf, position, department, phone, photo_url, hire_date],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Erro ao criar funcionário' });
      }
      res.status(201).json({ id: this.lastID, message: 'Funcionário criado com sucesso' });
    }
  );
});

// Atualizar funcionário
router.put('/:id', authenticateToken, (req, res) => {
  const { name, email, position, department, phone, photo_url, status } = req.body;

  db.run(
    `UPDATE employees 
     SET name = ?, email = ?, position = ?, department = ?, phone = ?, photo_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [name, email, position, department, phone, photo_url, status, req.params.id],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'Erro ao atualizar funcionário' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Funcionário não encontrado' });
      }
      res.json({ message: 'Funcionário atualizado com sucesso' });
    }
  );
});

// Deletar funcionário (soft delete)
router.delete('/:id', authenticateToken, (req, res) => {
  db.run(
    'UPDATE employees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    ['inactive', req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao deletar funcionário' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Funcionário não encontrado' });
      }
      res.json({ message: 'Funcionário desativado com sucesso' });
    }
  );
});

export default router;
