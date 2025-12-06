/**
 * Utilidades para logging em produção
 */

const logger = {
  info: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp,
      message,
      ...data
    }));
  },

  error: (message, error = {}) => {
    const timestamp = new Date().toISOString();
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp,
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }));
  },

  warn: (message, data = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp,
      message,
      ...data
    }));
  },

  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(JSON.stringify({
        level: 'DEBUG',
        timestamp,
        message,
        ...data
      }));
    }
  }
};

// Export default para import padrão (import logger from)
export default logger;

// Export named para import com destructuring (import { logger } from)
export { logger };

/**
 * Middleware para logging de requisições
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress
    });
  });
  
  next();
};

/**
 * Monitor de performance de queries
 */
export const queryLogger = async (query, params, client) => {
  const start = Date.now();
  
  try {
    const result = await client.query(query, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) { // Queries lentas (> 1s)
      logger.warn('Slow query detected', {
        duration: `${duration}ms`,
        query: query.substring(0, 100) // Primeiros 100 caracteres
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Query error', error);
    throw error;
  }
};
