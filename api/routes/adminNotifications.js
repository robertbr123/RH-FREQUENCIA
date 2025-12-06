import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Middleware para verificar se é admin ou gestor
const requireAdminOrGestor = (req, res, next) => {
  if (!req.user || !['admin', 'gestor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores e gestores.' });
  }
  next();
};

// ==========================================
// ENVIO DE NOTIFICAÇÕES
// ==========================================

// Enviar notificação para funcionários
router.post('/send', authenticateToken, requireAdminOrGestor, async (req, res) => {
  const { title, message, type, link, employee_ids } = req.body;

  try {
    if (!title || !message || !employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({ error: 'Título, mensagem e destinatários são obrigatórios' });
    }

    const validTypes = ['info', 'warning', 'success', 'error'];
    const notifType = validTypes.includes(type) ? type : 'info';

    // Inserir notificações em batch
    const values = employee_ids.map((empId, index) => {
      const offset = index * 5;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    }).join(', ');

    const params = employee_ids.flatMap(empId => [empId, title, message, notifType, link || null]);

    const query = `
      INSERT INTO employee_notifications (employee_id, title, message, type, link)
      VALUES ${values}
      RETURNING id
    `;

    const result = await pool.query(query, params);

    // Log da ação
    logger.info('Notificação enviada', { 
      adminName: req.user.name || req.user.username, 
      title, 
      recipientCount: employee_ids.length 
    });

    res.json({
      success: true,
      message: `Notificação enviada para ${employee_ids.length} funcionário(s)`,
      notifications_created: result.rows.length
    });

  } catch (error) {
    logger.error('Erro ao enviar notificação', error);
    res.status(500).json({ error: 'Erro ao enviar notificação' });
  }
});

// ==========================================
// HISTÓRICO DE NOTIFICAÇÕES
// ==========================================

// Listar histórico de notificações enviadas
router.get('/history', authenticateToken, requireAdminOrGestor, async (req, res) => {
  const { limit = 100, employee_id } = req.query;

  try {
    let query = `
      SELECT 
        n.id,
        n.employee_id,
        e.name as employee_name,
        n.title,
        n.message,
        n.type,
        n.is_read,
        n.link,
        n.created_at
      FROM employee_notifications n
      JOIN employees e ON n.employee_id = e.id
    `;

    const params = [];
    
    if (employee_id) {
      params.push(employee_id);
      query += ` WHERE n.employee_id = $${params.length}`;
    }

    query += ` ORDER BY n.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    // Adicionar nome do remetente (por enquanto, usar placeholder)
    const notifications = result.rows.map(n => ({
      ...n,
      sent_by_name: 'Sistema'
    }));

    res.json(notifications);

  } catch (error) {
    logger.error('Erro ao buscar histórico', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de notificações' });
  }
});

// ==========================================
// GERENCIAMENTO DE NOTIFICAÇÕES
// ==========================================

// Deletar notificação
router.delete('/:id', authenticateToken, requireAdminOrGestor, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM employee_notifications WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json({ success: true, message: 'Notificação removida' });

  } catch (error) {
    logger.error('Erro ao deletar notificação', error);
    res.status(500).json({ error: 'Erro ao deletar notificação' });
  }
});

// Obter estatísticas de notificações
router.get('/stats', authenticateToken, requireAdminOrGestor, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_read = false) as unread,
        COUNT(*) FILTER (WHERE is_read = true) as read,
        COUNT(*) FILTER (WHERE type = 'info') as info_count,
        COUNT(*) FILTER (WHERE type = 'warning') as warning_count,
        COUNT(*) FILTER (WHERE type = 'success') as success_count,
        COUNT(*) FILTER (WHERE type = 'error') as error_count,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as last_7_days
      FROM employee_notifications
    `);

    res.json(stats.rows[0]);

  } catch (error) {
    logger.error('Erro ao buscar estatísticas', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// Marcar todas como lidas para um funcionário específico (admin)
router.put('/mark-all-read/:employeeId', authenticateToken, requireAdminOrGestor, async (req, res) => {
  const { employeeId } = req.params;

  try {
    await pool.query(
      'UPDATE employee_notifications SET is_read = true WHERE employee_id = $1',
      [employeeId]
    );

    res.json({ success: true, message: 'Todas notificações marcadas como lidas' });

  } catch (error) {
    logger.error('Erro ao marcar notificações', error);
    res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
});

export default router;
