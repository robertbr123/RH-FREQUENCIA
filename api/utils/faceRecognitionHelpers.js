import pool from '../database.js';
import logger from './logger.js';
import {
  getCachedFaceDescriptors,
  cacheFaceDescriptors,
  updateCachedFaceDescriptor,
  isCacheAvailable,
  initDragonflyConnection
} from './dragonflyCache.js';

const FACE_THRESHOLD = 0.6;

// Inicializar conexão com Redis ao carregar o módulo (não bloqueia se falhar)
try {
  initDragonflyConnection().catch(err => {
    logger.warn('Redis não disponível, usando apenas banco de dados:', err.message || err);
  });
} catch (err) {
  logger.warn('Redis: Erro ao inicializar:', err.message || err);
}

/**
 * Calcula distância euclidiana entre dois descriptors
 * Otimizado para performance com Float64Array
 */
function euclideanDistance(desc1, desc2) {
  if (desc1.length !== desc2.length) {
    logger.error(`Tamanhos diferentes: ${desc1.length} vs ${desc2.length}`);
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Busca todos os funcionários com face cadastrada
 * Primeiro tenta do cache Dragonfly, senão vai ao banco
 */
export async function getEmployeesWithFace() {
  const startTime = Date.now();
  
  // Tentar buscar do cache primeiro
  if (isCacheAvailable()) {
    const cached = await getCachedFaceDescriptors();
    if (cached && cached.length > 0) {
      logger.debug(`🚀 Faces carregadas do cache em ${Date.now() - startTime}ms (${cached.length} funcionários)`);
      return cached;
    }
  }
  
  // Fallback para banco de dados
  logger.debug('Buscando faces do banco de dados...');
  const result = await pool.query(
    `SELECT id, name, cpf, face_descriptor 
     FROM employees 
     WHERE status = 'active' AND face_descriptor IS NOT NULL AND face_descriptor != ''`
  );
  
  const employees = result.rows;
  logger.debug(`📊 Banco: ${employees.length} funcionários em ${Date.now() - startTime}ms`);
  
  // Cachear para próximas requisições (async, não bloqueia)
  if (employees.length > 0) {
    cacheFaceDescriptors(employees).catch(err => {
      logger.warn('Erro ao cachear faces:', err.message);
    });
  }
  
  return employees;
}

/**
 * Valida o formato do face descriptor
 */
export function validateFaceDescriptor(faceDescriptor) {
  if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
    return { valid: false, error: 'faceDescriptor inválido', details: 'Descriptor deve ser um array de números' };
  }

  if (faceDescriptor.length !== 128) {
    return { valid: false, error: 'faceDescriptor inválido', details: `Descriptor deve ter 128 valores, mas tem ${faceDescriptor.length}` };
  }

  return { valid: true };
}

/**
 * Encontra o melhor match entre um descriptor e funcionários cadastrados
 * Otimizado para processar muitos funcionários rapidamente
 */
export function findBestMatch(faceDescriptor, employees) {
  const startTime = Date.now();
  let bestMatch = null;
  let bestDistance = Infinity;
  let processedCount = 0;

  for (const employee of employees) {
    if (!employee.face_descriptor) continue;

    try {
      // Parse do descriptor (pode vir como string do cache ou banco)
      let storedDescriptor = employee.face_descriptor;
      if (typeof storedDescriptor === 'string') {
        storedDescriptor = JSON.parse(storedDescriptor);
      }
      
      if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) {
        logger.warn(`${employee.name}: descriptor inválido (${storedDescriptor?.length} valores)`);
        continue;
      }
      
      const distance = euclideanDistance(faceDescriptor, storedDescriptor);
      processedCount++;

      if (distance < bestDistance) {
        bestDistance = distance;
        if (distance < FACE_THRESHOLD) {
          bestMatch = employee;
        }
      }
    } catch (parseError) {
      logger.error(`Erro ao parsear descriptor de ${employee.name}:`, parseError.message);
    }
  }

  const elapsed = Date.now() - startTime;
  logger.debug(`🔍 Comparação: ${processedCount} faces em ${elapsed}ms | Melhor: ${bestDistance.toFixed(3)} (threshold: ${FACE_THRESHOLD})`);

  return { bestMatch, bestDistance, threshold: FACE_THRESHOLD };
}

/**
 * Verifica se funcionário existe
 */
export async function getEmployeeById(employeeId) {
  const result = await pool.query(
    'SELECT id, name, cpf FROM employees WHERE id = $1',
    [employeeId]
  );
  return result.rows[0] || null;
}

/**
 * Registra face descriptor para um funcionário
 * Atualiza tanto o banco quanto o cache
 */
export async function saveFaceDescriptor(employeeId, faceDescriptor) {
  // Salvar no banco
  const result = await pool.query(
    'UPDATE employees SET face_descriptor = $1 WHERE id = $2 RETURNING id, name, cpf',
    [JSON.stringify(faceDescriptor), employeeId]
  );
  
  const employee = result.rows[0];
  
  // Atualizar cache (async, não bloqueia resposta)
  if (employee) {
    updateCachedFaceDescriptor(
      employee.id, 
      employee.name, 
      employee.cpf, 
      faceDescriptor
    ).catch(err => {
      logger.warn('Erro ao atualizar cache após registro de face:', err.message);
    });
  }
  
  return employee;
}
