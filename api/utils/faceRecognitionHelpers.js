import pool from '../database.js';

const FACE_THRESHOLD = 0.6;

/**
 * Calcula distância euclidiana entre dois descriptors
 */
function euclideanDistance(desc1, desc2) {
  if (desc1.length !== desc2.length) {
    console.error(`Tamanhos diferentes: ${desc1.length} vs ${desc2.length}`);
    return Infinity;
  }
  return Math.sqrt(
    desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0)
  );
}

/**
 * Busca todos os funcionários com face cadastrada
 */
export async function getEmployeesWithFace() {
  const result = await pool.query(
    `SELECT id, name, cpf, face_descriptor 
     FROM employees 
     WHERE status = 'active' AND face_descriptor IS NOT NULL AND face_descriptor != ''`
  );
  return result.rows;
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
 */
export function findBestMatch(faceDescriptor, employees) {
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const employee of employees) {
    if (!employee.face_descriptor) continue;

    try {
      const storedDescriptor = JSON.parse(employee.face_descriptor);
      
      if (!Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) {
        console.error(`❌ ${employee.name}: descriptor inválido`);
        continue;
      }
      
      const distance = euclideanDistance(faceDescriptor, storedDescriptor);
      console.log(`✅ ${employee.name}: distância = ${distance.toFixed(3)} (threshold: ${FACE_THRESHOLD})`);

      if (distance < bestDistance && distance < FACE_THRESHOLD) {
        bestDistance = distance;
        bestMatch = employee;
      }
    } catch (parseError) {
      console.error(`❌ Erro ao parsear descriptor de ${employee.name}:`, parseError.message);
    }
  }

  return { bestMatch, bestDistance, threshold: FACE_THRESHOLD };
}

/**
 * Verifica se funcionário existe
 */
export async function getEmployeeById(employeeId) {
  const result = await pool.query(
    'SELECT id, name FROM employees WHERE id = $1',
    [employeeId]
  );
  return result.rows[0] || null;
}

/**
 * Registra face descriptor para um funcionário
 */
export async function saveFaceDescriptor(employeeId, faceDescriptor) {
  const result = await pool.query(
    'UPDATE employees SET face_descriptor = $1 WHERE id = $2 RETURNING id, name',
    [JSON.stringify(faceDescriptor), employeeId]
  );
  return result.rows[0];
}
