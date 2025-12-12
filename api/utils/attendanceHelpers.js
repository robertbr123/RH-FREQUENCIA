import pool from '../database.js';

/**
 * Determina o próximo tipo de ponto baseado nos já registrados
 */
export async function getNextPunchType(employeeId, date, schedule) {
  const punches = await pool.query(
    `SELECT punch_type, punch_time 
     FROM attendance_punches 
     WHERE employee_id = $1 AND date = $2
     ORDER BY punch_time ASC`,
    [employeeId, date]
  );

  const registered = punches.rows.map(p => p.punch_type);
  const hasBreak = schedule && schedule.break_start && schedule.break_end;

  if (!registered.includes('entry')) {
    return { type: 'entry', message: 'Entrada registrada', next: hasBreak ? 'Saída para intervalo' : 'Saída final' };
  }

  if (hasBreak && !registered.includes('break_start')) {
    return { type: 'break_start', message: 'Saída para intervalo registrada', next: 'Retorno do intervalo' };
  }

  if (hasBreak && !registered.includes('break_end')) {
    return { type: 'break_end', message: 'Retorno do intervalo registrado', next: 'Saída final' };
  }

  if (!registered.includes('exit')) {
    return { type: 'exit', message: 'Saída registrada', next: 'Todos os pontos concluídos' };
  }

  return { type: null, message: 'Todos os pontos do dia já foram registrados', next: null };
}

/**
 * Valida o horário do ponto em relação ao schedule
 */
export function validatePunchTime(punchType, currentTime, schedule, toleranceMinutes = 30) {
  if (!schedule) return { valid: true };

  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  const timeMapping = {
    entry: { time: schedule.start_time, label: 'entrada' },
    break_start: { time: schedule.break_start, label: 'saída para intervalo' },
    break_end: { time: schedule.break_end, label: 'retorno do intervalo' },
    exit: { time: schedule.end_time, label: 'saída' }
  };

  const mapping = timeMapping[punchType];
  if (!mapping?.time) return { valid: true };

  const [expectedHour, expectedMinute] = mapping.time.split(':').map(Number);
  const expectedTotalMinutes = expectedHour * 60 + expectedMinute;

  const diff = currentTotalMinutes - expectedTotalMinutes;
  const isLate = diff > toleranceMinutes;
  const isEarly = diff < -toleranceMinutes;

  return {
    valid: true,
    expectedTime: mapping.time,
    diff,
    isLate,
    isEarly,
    message: isLate ? `${Math.abs(diff)} minutos de atraso na ${mapping.label}` :
             isEarly ? `${Math.abs(diff)} minutos adiantado na ${mapping.label}` :
             `Pontual (${mapping.label})`
  };
}

/**
 * Busca funcionário com seu horário de trabalho
 * Suporta múltiplos departamentos - usa o departamento principal ou o especificado
 */
export async function getEmployeeWithSchedule(employeeId, departmentId = null) {
  // Se um departamento específico foi passado, buscar schedule desse departamento
  if (departmentId) {
    const deptResult = await pool.query(
      `SELECT e.*, 
              ed.department_id, ed.schedule_id, ed.is_primary,
              s.start_time, s.end_time, s.break_start, s.break_end, s.name as schedule_name,
              d.name as department_name, p.name as position_name
       FROM employees e
       LEFT JOIN employee_departments ed ON e.id = ed.employee_id AND ed.department_id = $2
       LEFT JOIN schedules s ON ed.schedule_id = s.id
       LEFT JOIN departments d ON ed.department_id = d.id
       LEFT JOIN positions p ON e.position_id = p.id
       WHERE e.id = $1`,
      [employeeId, departmentId]
    );

    if (deptResult.rows.length > 0 && deptResult.rows[0].department_id) {
      return deptResult.rows[0];
    }
  }

  // Buscar pelo departamento principal na nova tabela
  const primaryResult = await pool.query(
    `SELECT e.*, 
            ed.department_id, ed.schedule_id, ed.is_primary,
            s.start_time, s.end_time, s.break_start, s.break_end, s.name as schedule_name,
            d.name as department_name, p.name as position_name
     FROM employees e
     LEFT JOIN employee_departments ed ON e.id = ed.employee_id AND ed.is_primary = true
     LEFT JOIN schedules s ON ed.schedule_id = s.id
     LEFT JOIN departments d ON ed.department_id = d.id
     LEFT JOIN positions p ON e.position_id = p.id
     WHERE e.id = $1`,
    [employeeId]
  );

  if (primaryResult.rows.length > 0 && primaryResult.rows[0].schedule_id) {
    return primaryResult.rows[0];
  }

  // Fallback: buscar pela tabela employees diretamente (retrocompatibilidade)
  const result = await pool.query(
    `SELECT e.*, e.schedule_id,
            s.start_time, s.end_time, s.break_start, s.break_end, s.name as schedule_name,
            d.name as department_name, p.name as position_name
     FROM employees e
     LEFT JOIN schedules s ON e.schedule_id = s.id
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN positions p ON e.position_id = p.id
     WHERE e.id = $1`,
    [employeeId]
  );

  return result.rows[0] || null;
}

/**
 * Busca todos os departamentos de um funcionário com seus horários
 */
export async function getEmployeeDepartments(employeeId) {
  const result = await pool.query(
    `SELECT ed.*, 
            d.name as department_name,
            s.name as schedule_name,
            s.start_time, s.end_time, s.break_start, s.break_end
     FROM employee_departments ed
     LEFT JOIN departments d ON ed.department_id = d.id
     LEFT JOIN schedules s ON ed.schedule_id = s.id
     WHERE ed.employee_id = $1
     ORDER BY ed.is_primary DESC, d.name ASC`,
    [employeeId]
  );

  return result.rows;
}

/**
 * Extrai schedule do employee result
 */
export function extractSchedule(employee) {
  if (!employee.schedule_id) return null;
  
  return {
    start_time: employee.start_time,
    end_time: employee.end_time,
    break_start: employee.break_start,
    break_end: employee.break_end
  };
}

/**
 * Busca todos os pontos de um funcionário em uma data
 */
export async function getTodayPunches(employeeId, date) {
  const result = await pool.query(
    `SELECT punch_type, TO_CHAR(punch_time, 'HH24:MI') as time
     FROM attendance_punches
     WHERE employee_id = $1 AND date = $2
     ORDER BY punch_time ASC`,
    [employeeId, date]
  );

  return result.rows;
}

/**
 * Calcula horas trabalhadas baseado nos pontos
 */
export function calculateHoursWorked(punches) {
  const entry = punches.find(p => p.punch_type === 'entry');
  const breakStart = punches.find(p => p.punch_type === 'break_start');
  const breakEnd = punches.find(p => p.punch_type === 'break_end');
  const exit = punches.find(p => p.punch_type === 'exit');

  if (!entry || !exit) return null;

  const entryTime = new Date(`2000-01-01T${entry.time}`);
  const exitTime = new Date(`2000-01-01T${exit.time}`);
  let totalMinutes = (exitTime - entryTime) / 1000 / 60;

  if (breakStart && breakEnd) {
    const breakStartTime = new Date(`2000-01-01T${breakStart.time}`);
    const breakEndTime = new Date(`2000-01-01T${breakEnd.time}`);
    const breakMinutes = (breakEndTime - breakStartTime) / 1000 / 60;
    totalMinutes -= breakMinutes;
  }

  return (totalMinutes / 60).toFixed(2);
}

/**
 * Formata resposta do registro de ponto
 */
export function formatPunchResponse(punchInfo, timeValidation, punches, employee, schedule) {
  const entry = punches.find(p => p.punch_type === 'entry');
  const breakStart = punches.find(p => p.punch_type === 'break_start');
  const breakEnd = punches.find(p => p.punch_type === 'break_end');
  const exit = punches.find(p => p.punch_type === 'exit');
  
  const hoursWorked = calculateHoursWorked(punches);

  return {
    success: true,
    punch: {
      type: punchInfo.type,
      time: getLocalTime(), // Usar timezone correto
      message: punchInfo.message,
      timeValidation: timeValidation?.message || null
    },
    next: punchInfo.next,
    today: {
      entry: entry?.time || null,
      break_start: breakStart?.time || null,
      break_end: breakEnd?.time || null,
      exit: exit?.time || null,
      hours_worked: hoursWorked
    },
    employee: {
      id: employee.id,
      name: employee.name,
      photo_url: employee.photo_url || null,
      department: employee.department_name || null,
      position: employee.position_name || null,
      schedule: schedule ? `${schedule.start_time} - ${schedule.end_time}` : 'Não definido'
    }
  };
}

// Timezone padrão (Eirunepé/AM usa America/Rio_Branco, mesmo fuso de Acre)
const TIMEZONE = 'America/Rio_Branco';

/**
 * Formata data no timezone correto (YYYY-MM-DD)
 */
export function getLocalDate() {
  const now = new Date();
  
  // Formatar no timezone correto
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // en-CA retorna no formato YYYY-MM-DD
  return formatter.format(now);
}

/**
 * Formata hora no timezone correto (HH:MM)
 */
export function getLocalTime() {
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  return formatter.format(now);
}

/**
 * Retorna Date no timezone correto
 */
export function getLocalNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}
