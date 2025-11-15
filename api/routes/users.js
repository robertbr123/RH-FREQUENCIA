import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Listar todos os usuários (apenas admin)
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, name, email, role, status, created_at FROM users ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Buscar usuário por ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // Usuários podem ver apenas seu próprio perfil, admins podem ver todos
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await pool.query(
      'SELECT id, username, name, email, role, status, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Criar novo usuário (apenas admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { username, password, name, email, role } = req.body;

  try {
    // Validar campos obrigatórios
    if (!username || !password || !name || !role) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: username, password, name, role' 
      });
    }

    // Validar role
    const validRoles = ['admin', 'gestor', 'operador'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Nível de acesso inválido' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, password, name, email, role, status) 
       VALUES ($1, $2, $3, $4, $5, 'active') 
       RETURNING id, username, name, email, role, status, created_at`,
      [username, hashedPassword, name, email || null, role]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Usuário ou email já existe' });
    }
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: error.message || 'Erro ao criar usuário' });
  }
});

// Atualizar usuário (admin pode atualizar todos, usuário pode atualizar apenas seu perfil)
router.put('/:id', authenticateToken, async (req, res) => {
  const { name, email, role, status } = req.body;
  const userId = parseInt(req.params.id);

  try {
    // Verificar permissões
    const isOwnProfile = req.user.id === userId;
    const isAdminUser = req.user.role === 'admin';

    if (!isOwnProfile && !isAdminUser) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Apenas admin pode alterar role e status
    let query, params;
    if (isAdminUser) {
      query = `UPDATE users 
               SET name = $1, email = $2, role = $3, status = $4 
               WHERE id = $5 
               RETURNING id, username, name, email, role, status, created_at`;
      params = [name, email, role, status, userId];
    } else {
      // Usuário comum só pode alterar nome e email
      query = `UPDATE users 
               SET name = $1, email = $2 
               WHERE id = $3 
               RETURNING id, username, name, email, role, status, created_at`;
      params = [name, email, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email já está em uso' });
    }
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Alterar senha (próprio usuário ou admin)
router.put('/:id/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = parseInt(req.params.id);

  try {
    const isOwnProfile = req.user.id === userId;
    const isAdminUser = req.user.role === 'admin';

    if (!isOwnProfile && !isAdminUser) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Se não for admin, verificar senha atual
    if (!isAdminUser) {
      const userResult = await pool.query(
        'SELECT password FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }
    }

    // Atualizar senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

// Deletar usuário (apenas admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    // Não permitir deletar o próprio usuário
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'Você não pode deletar seu próprio usuário' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// Desativar/Ativar usuário (apenas admin)
router.patch('/:id/status', authenticateToken, isAdmin, async (req, res) => {
  const { status } = req.body;

  try {
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const result = await pool.query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, username, name, status',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao alterar status:', error);
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
});

// Obter perfil do usuário logado
router.get('/me/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, name, email, role, status, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

export default router;
