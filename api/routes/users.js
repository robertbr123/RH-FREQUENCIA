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
      `SELECT id, username, name, email, role, department_id, status, created_at FROM users ORDER BY name ASC`
    );
    
    // Buscar departamentos de cada usuário gestor
    const usersWithDepartments = await Promise.all(
      result.rows.map(async (user) => {
        if (user.role === 'gestor') {
          const deptResult = await pool.query(
            `SELECT d.id, d.name 
             FROM user_departments ud 
             JOIN departments d ON ud.department_id = d.id 
             WHERE ud.user_id = $1`,
            [user.id]
          );
          return { ...user, departments: deptResult.rows };
        }
        return { ...user, departments: [] };
      })
    );
    
    res.json(usersWithDepartments);
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
      'SELECT id, username, name, email, role, department_id, status, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    
    // Buscar departamentos se for gestor
    if (user.role === 'gestor') {
      const deptResult = await pool.query(
        `SELECT d.id, d.name 
         FROM user_departments ud 
         JOIN departments d ON ud.department_id = d.id 
         WHERE ud.user_id = $1`,
        [user.id]
      );
      user.departments = deptResult.rows;
      user.department_ids = deptResult.rows.map(d => d.id);
    } else {
      user.departments = [];
      user.department_ids = [];
    }

    res.json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Criar novo usuário (apenas admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { username, password, name, email, role, department_id, department_ids } = req.body;

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

    // Usar department_ids (array) se fornecido, senão usar department_id (legacy)
    const deptIds = department_ids || (department_id ? [department_id] : []);

    // Se é gestor, pelo menos um departamento é obrigatório
    if (role === 'gestor' && deptIds.length === 0) {
      return res.status(400).json({ 
        error: 'Pelo menos um departamento é obrigatório para gestores' 
      });
    }

    // Validar se departamentos existem
    if (deptIds.length > 0) {
      const deptCheck = await pool.query(
        'SELECT id FROM departments WHERE id = ANY($1)',
        [deptIds]
      );
      if (deptCheck.rows.length !== deptIds.length) {
        return res.status(400).json({ error: 'Um ou mais departamentos não encontrados' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário (manter department_id para compatibilidade)
    const primaryDeptId = deptIds.length > 0 ? deptIds[0] : null;
    const result = await pool.query(
      `INSERT INTO users (username, password, name, email, role, department_id, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'active') 
       RETURNING id, username, name, email, role, department_id, status, created_at`,
      [username, hashedPassword, name, email || null, role, primaryDeptId]
    );

    const newUser = result.rows[0];

    // Inserir relacionamentos de departamentos para gestor
    if (role === 'gestor' && deptIds.length > 0) {
      for (const deptId of deptIds) {
        await pool.query(
          'INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newUser.id, deptId]
        );
      }
      
      // Retornar com departamentos
      const deptResult = await pool.query(
        `SELECT d.id, d.name FROM user_departments ud 
         JOIN departments d ON ud.department_id = d.id 
         WHERE ud.user_id = $1`,
        [newUser.id]
      );
      newUser.departments = deptResult.rows;
      newUser.department_ids = deptResult.rows.map(d => d.id);
    } else {
      newUser.departments = [];
      newUser.department_ids = [];
    }

    res.status(201).json(newUser);
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
  const { name, email, role, status, department_id, department_ids } = req.body;
  const userId = parseInt(req.params.id);

  try {
    // Verificar permissões
    const isOwnProfile = req.user.id === userId;
    const isAdminUser = req.user.role === 'admin';

    if (!isOwnProfile && !isAdminUser) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Usar department_ids (array) se fornecido, senão usar department_id (legacy)
    const deptIds = department_ids || (department_id ? [department_id] : []);

    // Se é gestor, validar departamentos
    if (role === 'gestor' && deptIds.length === 0) {
      return res.status(400).json({ 
        error: 'Pelo menos um departamento é obrigatório para gestores' 
      });
    }

    // Validar se departamentos existem
    if (deptIds.length > 0) {
      const deptCheck = await pool.query(
        'SELECT id FROM departments WHERE id = ANY($1)',
        [deptIds]
      );
      if (deptCheck.rows.length !== deptIds.length) {
        return res.status(400).json({ error: 'Um ou mais departamentos não encontrados' });
      }
    }

    // Apenas admin pode alterar role, status e department
    let query, params;
    const primaryDeptId = deptIds.length > 0 ? deptIds[0] : null;
    
    if (isAdminUser) {
      query = `UPDATE users 
               SET name = $1, email = $2, role = $3, status = $4, department_id = $5 
               WHERE id = $6 
               RETURNING id, username, name, email, role, department_id, status, created_at`;
      params = [name, email, role, status, primaryDeptId, userId];
    } else {
      // Usuário comum só pode alterar nome e email
      query = `UPDATE users 
               SET name = $1, email = $2 
               WHERE id = $3 
               RETURNING id, username, name, email, role, department_id, status, created_at`;
      params = [name, email, userId];
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updatedUser = result.rows[0];

    // Atualizar relacionamentos de departamentos se for admin editando
    if (isAdminUser && role === 'gestor') {
      // Remover departamentos antigos
      await pool.query('DELETE FROM user_departments WHERE user_id = $1', [userId]);
      
      // Inserir novos departamentos
      for (const deptId of deptIds) {
        await pool.query(
          'INSERT INTO user_departments (user_id, department_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, deptId]
        );
      }
      
      // Retornar com departamentos
      const deptResult = await pool.query(
        `SELECT d.id, d.name FROM user_departments ud 
         JOIN departments d ON ud.department_id = d.id 
         WHERE ud.user_id = $1`,
        [userId]
      );
      updatedUser.departments = deptResult.rows;
      updatedUser.department_ids = deptResult.rows.map(d => d.id);
    } else if (isAdminUser && role !== 'gestor') {
      // Se mudou de gestor para outro role, remover departamentos
      await pool.query('DELETE FROM user_departments WHERE user_id = $1', [userId]);
      updatedUser.departments = [];
      updatedUser.department_ids = [];
    } else {
      updatedUser.departments = [];
      updatedUser.department_ids = [];
    }

    res.json(updatedUser);
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
      'SELECT id, username, name, email, role, department_id, status, created_at FROM users WHERE id = $1',
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
