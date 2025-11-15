import express from 'express';
import db from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Registrar check-in
router.post('/check-in', authenticateToken, (req, res) => {
  const { employee_id, notes } = req.body;

  // Verificar se já existe check-in hoje sem check-out
  const today = new Date().toISOString().split('T')[0];
  
  db.get(
    `SELECT * FROM attendance 
     WHERE employee_id = ? 
     AND DATE(check_in) = ? 
     AND check_out IS NULL`,
    [employee_id, today],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar registro' });
      }
      
      if (existing) {
        return res.status(400).json({ error: 'Já existe um check-in ativo para hoje' });
      }

      db.run(
        'INSERT INTO attendance (employee_id, check_in, notes) VALUES (?, CURRENT_TIMESTAMP, ?)',
        [employee_id, notes],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Erro ao registrar check-in' });
          }
          res.status(201).json({ 
            id: this.lastID, 
            message: 'Check-in registrado com sucesso' 
          });
        }
      );
    }
  );
});

// Registrar check-out
router.post('/check-out', authenticateToken, (req, res) => {
  const { employee_id, notes } = req.body;

  // Buscar último check-in sem check-out
  db.get(
    `SELECT * FROM attendance 
     WHERE employee_id = ? 
     AND check_out IS NULL 
     ORDER BY check_in DESC 
     LIMIT 1`,
    [employee_id],
    (err, attendance) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar registro' });
      }

      if (!attendance) {
        return res.status(404).json({ error: 'Nenhum check-in ativo encontrado' });
      }

      db.run(
        'UPDATE attendance SET check_out = CURRENT_TIMESTAMP, notes = ? WHERE id = ?',
        [notes || attendance.notes, attendance.id],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Erro ao registrar check-out' });
          }
          res.json({ message: 'Check-out registrado com sucesso' });
        }
      );
    }
  );
});

// Listar registros de frequência
router.get('/', authenticateToken, (req, res) => {
  const { employee_id, start_date, end_date } = req.query;
  
  let query = `
    SELECT a.*, e.name as employee_name, e.position, e.department
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    WHERE 1=1
  `;
  const params = [];

  if (employee_id) {
    query += ' AND a.employee_id = ?';
    params.push(employee_id);
  }

  if (start_date) {
    query += ' AND DATE(a.check_in) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(a.check_in) <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY a.check_in DESC';

  db.all(query, params, (err, records) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar registros' });
    }
    res.json(records);
  });
});

// Estatísticas de frequência
router.get('/stats/:employee_id', authenticateToken, (req, res) => {
  const { employee_id } = req.params;
  const { month, year } = req.query;

  let dateFilter = '';
  const params = [employee_id];

  if (month && year) {
    dateFilter = `AND strftime('%Y-%m', check_in) = ?`;
    params.push(`${year}-${month.padStart(2, '0')}`);
  }

  db.get(
    `SELECT 
      COUNT(*) as total_days,
      COUNT(CASE WHEN check_out IS NOT NULL THEN 1 END) as complete_days,
      COUNT(CASE WHEN check_out IS NULL THEN 1 END) as incomplete_days
     FROM attendance 
     WHERE employee_id = ? ${dateFilter}`,
    params,
    (err, stats) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
      }
      res.json(stats);
    }
  );
});

export default router;
