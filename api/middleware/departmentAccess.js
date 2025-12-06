import pool from '../database.js';

/**
 * Middleware para verificar acesso a dados do departamento
 * - Admin: acesso total
 * - Gestor: acesso aos departamentos associados
 * - Operador: acesso total (conforme necessário)
 */
export const checkDepartmentAccess = async (req, res, next) => {
  try {
    // Admin tem acesso a tudo
    if (req.user.role === 'admin') {
      return next();
    }

    // Gestor tem acesso aos seus departamentos
    if (req.user.role === 'gestor') {
      // Buscar departamentos do usuário da tabela user_departments
      const deptResult = await pool.query(
        'SELECT department_id FROM user_departments WHERE user_id = $1',
        [req.user.id]
      );

      if (deptResult.rows.length === 0) {
        // Fallback: tentar buscar department_id da tabela users (compatibilidade)
        const userResult = await pool.query(
          'SELECT department_id FROM users WHERE id = $1',
          [req.user.id]
        );

        if (userResult.rows.length > 0 && userResult.rows[0].department_id) {
          req.userDepartmentIds = [userResult.rows[0].department_id];
          req.userDepartmentId = userResult.rows[0].department_id; // compatibilidade
        } else {
          return res.status(403).json({ 
            error: 'Gestor sem departamento atribuído' 
          });
        }
      } else {
        req.userDepartmentIds = deptResult.rows.map(r => r.department_id);
        req.userDepartmentId = deptResult.rows[0].department_id; // compatibilidade
      }
    }

    next();
  } catch (error) {
    console.error('Erro ao verificar acesso de departamento:', error);
    res.status(500).json({ error: 'Erro ao verificar acesso' });
  }
};

/**
 * Valida se um gestor tem acesso a um departamento específico
 * @param {number} employeeDepartmentId - ID do departamento do funcionário
 * @param {string} userRole - Role do usuário
 * @param {number|number[]} userDepartmentIds - ID(s) do(s) departamento(s) do usuário
 */
export const hasAccessToEmployee = async (employeeDepartmentId, userRole, userDepartmentIds) => {
  if (userRole === 'admin') return true;
  if (userRole === 'gestor') {
    // Suportar tanto array quanto número único (compatibilidade)
    if (Array.isArray(userDepartmentIds)) {
      return userDepartmentIds.includes(employeeDepartmentId);
    }
    return employeeDepartmentId === userDepartmentIds;
  }
  return true; // operador tem acesso
};

/**
 * Retorna os IDs dos departamentos do usuário gestor
 */
export const getUserDepartmentIds = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT department_id FROM user_departments WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length > 0) {
      return result.rows.map(r => r.department_id);
    }
    
    // Fallback para a coluna department_id
    const userResult = await pool.query(
      'SELECT department_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length > 0 && userResult.rows[0].department_id) {
      return [userResult.rows[0].department_id];
    }
    
    return [];
  } catch (error) {
    console.error('Erro ao buscar departamentos do usuário:', error);
    return [];
  }
};
