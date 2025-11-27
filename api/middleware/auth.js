import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔐 Auth Middleware - Verificando token...');
    console.log('Authorization header presente:', !!authHeader);
    console.log('Token extraído:', token ? `${token.substring(0, 20)}...` : 'nenhum');

    if (!token) {
      console.warn('❌ Token não fornecido no header Authorization');
      return res.status(401).json({ 
        error: 'Token não fornecido',
        hint: 'Inclua o header: Authorization: Bearer <token>' 
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'secret';
    
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET não configurado - usando valor padrão (inseguro!)');
    }

    jwt.verify(token, jwtSecret, (err, user) => {
      if (err) {
        console.error('❌ Erro ao verificar token:', err.message);
        console.error('Tipo de erro:', err.name);
        
        if (err.name === 'TokenExpiredError') {
          return res.status(403).json({ 
            error: 'Token expirado',
            hint: 'Faça login novamente' 
          });
        }
        
        if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({ 
            error: 'Token inválido',
            hint: 'Formato do token incorreto ou assinatura inválida' 
          });
        }
        
        return res.status(403).json({ 
          error: 'Erro ao validar token',
          details: err.message 
        });
      }
      
      // Normalizar: garantir que userId e role estejam disponíveis
      req.user = {
        userId: user.id || user.userId,
        username: user.username,
        role: user.role,
        ...user
      };
      
      console.log('✅ Auth OK - User:', {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role
      });
      
      next();
    });
  } catch (error) {
    console.error('💥 Erro crítico no auth middleware:', error);
    return res.status(500).json({ 
      error: 'Erro interno no sistema de autenticação',
      details: error.message 
    });
  }
};
