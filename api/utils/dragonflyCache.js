import { createClient } from 'redis';
import logger from './logger.js';

// Configuração do Redis
// Use REDIS_URL com a URL completa do Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log(`🔴 Redis: Configurado para ${REDIS_URL.replace(/:[^:@]+@/, ':***@')}`);

// Prefixos de cache
const CACHE_KEYS = {
  FACE_DESCRIPTORS: 'face:descriptors',      // Hash com todos os descriptors
  FACE_EMPLOYEE: 'face:employee:',           // face:employee:{id} - descriptor individual
  FACE_ALL_IDS: 'face:all_ids',              // Set com IDs de funcionários com face
  FACE_LAST_SYNC: 'face:last_sync',          // Timestamp da última sincronização
};

// TTL padrão: 1 hora (em segundos)
const DEFAULT_TTL = 3600;

let client = null;
let isConnected = false;

/**
 * Inicializa conexão com Redis
 */
export async function initRedisConnection() {
  if (client && isConnected) {
    return client;
  }

  try {
    console.log(`🔴 Redis: Tentando conectar...`);
    
    client = createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis: Máximo de tentativas de reconexão atingido');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      logger.error('Redis: Erro de conexão', { 
        message: err.message, 
        code: err.code
      });
      isConnected = false;
    });

    client.on('connect', () => {
      logger.info('🔴 Redis: Conectado com sucesso');
      isConnected = true;
    });

    client.on('reconnecting', () => {
      logger.info('🔴 Redis: Reconectando...');
    });

    await client.connect();
    isConnected = true;
    
    // Testar conexão com PING
    const pong = await client.ping();
    console.log(`🔴 Redis: PING respondeu: ${pong}`);
    
    return client;
  } catch (error) {
    logger.error('Redis: Falha ao conectar', { 
      message: error.message, 
      code: error.code
    });
    isConnected = false;
    return null;
  }
}

// Alias para compatibilidade
export const initDragonflyConnection = initRedisConnection;

/**
 * Verifica se o cache está disponível
 */
export function isCacheAvailable() {
  return client && isConnected;
}

/**
 * Armazena todos os face descriptors no cache
 * @param {Array} employees - Array de funcionários com face_descriptor
 */
export async function cacheFaceDescriptors(employees) {
  if (!isCacheAvailable()) {
    await initDragonflyConnection();
    if (!isCacheAvailable()) return false;
  }

  try {
    const pipeline = client.multi();
    
    // Limpar cache anterior
    pipeline.del(CACHE_KEYS.FACE_ALL_IDS);
    
    for (const emp of employees) {
      if (emp.face_descriptor) {
        const key = `${CACHE_KEYS.FACE_EMPLOYEE}${emp.id}`;
        const data = JSON.stringify({
          id: emp.id,
          name: emp.name,
          cpf: emp.cpf,
          face_descriptor: typeof emp.face_descriptor === 'string' 
            ? emp.face_descriptor 
            : JSON.stringify(emp.face_descriptor)
        });
        
        pipeline.set(key, data, { EX: DEFAULT_TTL });
        pipeline.sAdd(CACHE_KEYS.FACE_ALL_IDS, emp.id.toString());
      }
    }
    
    pipeline.set(CACHE_KEYS.FACE_LAST_SYNC, Date.now().toString(), { EX: DEFAULT_TTL });
    
    await pipeline.exec();
    logger.info(`� Redis: ${employees.length} face descriptors cacheados`);
    return true;
  } catch (error) {
    logger.error('Redis: Erro ao cachear descriptors', error.message);
    return false;
  }
}

/**
 * Busca todos os face descriptors do cache
 * @returns {Array|null} Array de funcionários ou null se cache vazio/indisponível
 */
export async function getCachedFaceDescriptors() {
  if (!isCacheAvailable()) {
    await initDragonflyConnection();
    if (!isCacheAvailable()) return null;
  }

  try {
    // Verificar se há dados no cache
    const ids = await client.sMembers(CACHE_KEYS.FACE_ALL_IDS);
    
    if (!ids || ids.length === 0) {
      logger.debug('Redis: Cache de faces vazio');
      return null;
    }

    // Buscar todos os descriptors em paralelo
    const keys = ids.map(id => `${CACHE_KEYS.FACE_EMPLOYEE}${id}`);
    const results = await client.mGet(keys);
    
    const employees = results
      .filter(r => r !== null)
      .map(r => {
        try {
          return JSON.parse(r);
        } catch {
          return null;
        }
      })
      .filter(e => e !== null);

    logger.debug(`� Redis: ${employees.length} faces recuperadas do cache`);
    return employees;
  } catch (error) {
    logger.error('Redis: Erro ao buscar cache', error.message);
    return null;
  }
}

/**
 * Atualiza um único face descriptor no cache
 * @param {number} employeeId 
 * @param {string} name 
 * @param {string} cpf 
 * @param {Array|string} faceDescriptor 
 */
export async function updateCachedFaceDescriptor(employeeId, name, cpf, faceDescriptor) {
  if (!isCacheAvailable()) {
    await initDragonflyConnection();
    if (!isCacheAvailable()) return false;
  }

  try {
    const key = `${CACHE_KEYS.FACE_EMPLOYEE}${employeeId}`;
    const data = JSON.stringify({
      id: employeeId,
      name,
      cpf,
      face_descriptor: typeof faceDescriptor === 'string' 
        ? faceDescriptor 
        : JSON.stringify(faceDescriptor)
    });
    
    await client.set(key, data, { EX: DEFAULT_TTL });
    await client.sAdd(CACHE_KEYS.FACE_ALL_IDS, employeeId.toString());
    
    logger.debug(`� Redis: Face de ${name} atualizada no cache`);
    return true;
  } catch (error) {
    logger.error('Redis: Erro ao atualizar cache', error.message);
    return false;
  }
}

/**
 * Remove um face descriptor do cache
 * @param {number} employeeId 
 */
export async function removeCachedFaceDescriptor(employeeId) {
  if (!isCacheAvailable()) return false;

  try {
    const key = `${CACHE_KEYS.FACE_EMPLOYEE}${employeeId}`;
    await client.del(key);
    await client.sRem(CACHE_KEYS.FACE_ALL_IDS, employeeId.toString());
    
    logger.debug(`� Redis: Face ${employeeId} removida do cache`);
    return true;
  } catch (error) {
    logger.error('Redis: Erro ao remover do cache', error.message);
    return false;
  }
}

/**
 * Invalida todo o cache de faces (força reload do banco)
 */
export async function invalidateFaceCache() {
  if (!isCacheAvailable()) return false;

  try {
    const ids = await client.sMembers(CACHE_KEYS.FACE_ALL_IDS);
    
    if (ids && ids.length > 0) {
      const keys = ids.map(id => `${CACHE_KEYS.FACE_EMPLOYEE}${id}`);
      await client.del(keys);
    }
    
    await client.del(CACHE_KEYS.FACE_ALL_IDS);
    await client.del(CACHE_KEYS.FACE_LAST_SYNC);
    
    logger.info('� Redis: Cache de faces invalidado');
    return true;
  } catch (error) {
    logger.error('Redis: Erro ao invalidar cache', error.message);
    return false;
  }
}

/**
 * Obtém estatísticas do cache
 */
export async function getCacheStats() {
  if (!isCacheAvailable()) {
    return { available: false };
  }

  try {
    const [count, lastSync] = await Promise.all([
      client.sCard(CACHE_KEYS.FACE_ALL_IDS),
      client.get(CACHE_KEYS.FACE_LAST_SYNC)
    ]);

    return {
      available: true,
      facesCount: count || 0,
      lastSync: lastSync ? new Date(parseInt(lastSync)).toISOString() : null
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

/**
 * Fecha conexão com Redis
 */
export async function closeRedisConnection() {
  if (client) {
    await client.quit();
    isConnected = false;
    logger.info('🔴 Redis: Conexão fechada');
  }
}

// Alias para compatibilidade
export const closeDragonflyConnection = closeRedisConnection;

export default {
  initDragonflyConnection,
  isCacheAvailable,
  cacheFaceDescriptors,
  getCachedFaceDescriptors,
  updateCachedFaceDescriptor,
  removeCachedFaceDescriptor,
  invalidateFaceCache,
  getCacheStats,
  closeDragonflyConnection
};
