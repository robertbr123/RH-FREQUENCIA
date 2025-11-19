import pool from '../database.js';

/**
 * Middleware para verificar acesso a dados do departamento
 * - Admin: acesso total
 * - Gestor: acesso apenas ao seu departamento
 * - Operador: acesso total (conforme necessário)
 */
export const checkDepartmentAccess = async (req, res, next) => {
  try {
    // Admin tem acesso a tudo
    if (req.user.role === 'admin') {
      return next();
    }

    // Gestor tem acesso apenas ao seu departamento
    if (req.user.role === 'gestor') {
      // Buscar informações do usuário incluindo seu departamento
      const userResult = await pool.query(
        'SELECT department_id FROM users WHERE id = $1',
        [req.user.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: 'Usuário não encontrado' });
      }

      const userDepartmentId = userResult.rows[0].department_id;

      if (!userDepartmentId) {
        return res.status(403).json({ 
          error: 'Gestor sem departamento atribuído' 
        });
      }

      // Armazenar o department_id no objeto request para uso posterior
      req.userDepartmentId = userDepartmentId;
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar acesso de departamento:', error);
    res.status(500).json({ error: 'Erro ao verificar acesso' });
  }
};

/**
 * Valida se um gestor tem acesso a um departamento específico
 */
export const hasAccessToEmployee = async (employeeDepartmentId, userRole, userDepartmentId) => {
  if (userRole === 'admin') return true;
  if (userRole === 'gestor') return employeeDepartmentId === userDepartmentId;
  return true; // operador tem acesso
};
