import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkDepartmentAccess, hasAccessToEmployee } from '../middleware/departmentAccess.js';

const router = express.Router();

// Função auxiliar: determinar próximo tipo de ponto
async function getNextPunchType(employeeId, date, schedule) {
  // Buscar pontos já registrados hoje
  const punches = await pool.query(
    `SELECT punch_type, punch_time 
     FROM attendance_punches 
     WHERE employee_id = $1 AND date = $2
     ORDER BY punch_time ASC`,
    [employeeId, date]
  );

  const registered = punches.rows.map(p => p.punch_type);
  const hasBreak = schedule && schedule.break_start && schedule.break_end;

  // Lógica de sequência
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

// Função auxiliar: validar tolerância de horário
function validatePunchTime(punchType, currentTime, schedule, toleranceMinutes = 30) {
  if (!schedule) return { valid: true };

  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  let expectedTime = null;
  let expectedLabel = '';

  switch (punchType) {
    case 'entry':
      expectedTime = schedule.start_time;
      expectedLabel = 'entrada';
      break;
    case 'break_start':
      expectedTime = schedule.break_start;
      expectedLabel = 'saída para intervalo';
      break;
    case 'break_end':
      expectedTime = schedule.break_end;
      expectedLabel = 'retorno do intervalo';
      break;
    case 'exit':
      expectedTime = schedule.end_time;
      expectedLabel = 'saída';
      break;
  }

  if (!expectedTime) return { valid: true };

  const [expectedHour, expectedMinute] = expectedTime.split(':').map(Number);
  const expectedTotalMinutes = expectedHour * 60 + expectedMinute;

  const diff = currentTotalMinutes - expectedTotalMinutes;
  const isLate = diff > toleranceMinutes;
  const isEarly = diff < -toleranceMinutes;

  return {
    valid: true, // Sempre permitir, mas informar
    expectedTime,
    diff,
    isLate,
    isEarly,
    message: isLate ? `${Math.abs(diff)} minutos de atraso na ${expectedLabel}` :
             isEarly ? `${Math.abs(diff)} minutos adiantado na ${expectedLabel}` :
             `Pontual (${expectedLabel})`
  };
}

// Registrar ponto (sistema inteligente com múltiplos pontos)
router.post('/', authenticateToken, async (req, res) => {
  const { employee_id } = req.body;

  try {
    if (!employee_id) {
      return res.status(400).json({ error: 'employee_id é obrigatório' });
    }

    console.log(`🕐 Registro de ponto - Funcionário ID: ${employee_id}`);

    // 1. Buscar funcionário com schedule
    const employeeResult = await pool.query(
      `SELECT e.*, e.schedule_id,
              s.start_time, s.end_time, s.break_start, s.break_end, s.name as schedule_name
       FROM employees e
       LEFT JOIN schedules s ON e.schedule_id = s.id
       WHERE e.id = $1`,
      [employee_id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const employee = employeeResult.rows[0];

    if (employee.status === 'inactive') {
      return res.status(403).json({ error: 'Funcionário inativo' });
    }

    // 2. Obter data e hora atuais (timezone local do servidor)
    const now = new Date();
    // Usar data local em vez de UTC
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    const time = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

    console.log(`📅 Data: ${date} | Hora: ${time}`);

    // 3. Verificar último ponto registrado (evitar duplicatas)
    const lastPunch = await pool.query(
      `SELECT punch_time FROM attendance_punches
       WHERE employee_id = $1 AND date = $2
       ORDER BY punch_time DESC LIMIT 1`,
      [employee_id, date]
    );

    if (lastPunch.rows.length > 0) {
      const lastTime = new Date(lastPunch.rows[0].punch_time);
      const diffSeconds = (now - lastTime) / 1000;

      if (diffSeconds < 60) {
        return res.status(400).json({
          error: 'Ponto já registrado há menos de 1 minuto',
          lastPunch: lastTime
        });
      }
    }

    // 4. Determinar próximo tipo de ponto
    const schedule = employee.schedule_id ? {
      start_time: employee.start_time,
      end_time: employee.end_time,
      break_start: employee.break_start,
      break_end: employee.break_end
    } : null;

    const punchInfo = await getNextPunchType(employee_id, date, schedule);

    if (!punchInfo.type) {
      return res.status(400).json({
        error: 'Todos os pontos do dia já foram registrados',
        message: 'Você já completou todos os registros de hoje'
      });
    }

    console.log(`✅ Tipo de ponto: ${punchInfo.type}`);

    // 5. Validar horário (com tolerância de 30 minutos)
    const timeValidation = validatePunchTime(punchInfo.type, time, schedule, 30);

    // 6. Registrar o ponto com horário de Eirunepé/AM
    const result = await pool.query(
      `INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type, schedule_id)
       VALUES ($1, $2, CURRENT_TIMESTAMP AT TIME ZONE 'America/Rio_Branco', $3, $4)
       RETURNING *`,
      [employee_id, date, punchInfo.type, employee.schedule_id]
    );

    console.log(`✅ Ponto registrado: ${punchInfo.type} às ${time}`);

    // 7. Buscar todos os pontos de hoje
    const todayPunches = await pool.query(
      `SELECT punch_type, TO_CHAR(punch_time, 'HH24:MI') as time
       FROM attendance_punches
       WHERE employee_id = $1 AND date = $2
       ORDER BY punch_time ASC`,
      [employee_id, date]
    );

    // 8. Calcular horas trabalhadas (se já tiver saída)
    let hoursWorked = null;
    const punches = todayPunches.rows;
    const entry = punches.find(p => p.punch_type === 'entry');
    const breakStart = punches.find(p => p.punch_type === 'break_start');
    const breakEnd = punches.find(p => p.punch_type === 'break_end');
    const exit = punches.find(p => p.punch_type === 'exit');

    if (entry && exit) {
      const entryTime = new Date(`2000-01-01T${entry.time}`);
      const exitTime = new Date(`2000-01-01T${exit.time}`);
      let totalMinutes = (exitTime - entryTime) / 1000 / 60;

      if (breakStart && breakEnd) {
        const breakStartTime = new Date(`2000-01-01T${breakStart.time}`);
        const breakEndTime = new Date(`2000-01-01T${breakEnd.time}`);
        const breakMinutes = (breakEndTime - breakStartTime) / 1000 / 60;
        totalMinutes -= breakMinutes;
      }

      hoursWorked = (totalMinutes / 60).toFixed(2);
    }

    // 9. Retornar resposta
    res.status(201).json({
      success: true,
      punch: {
        type: punchInfo.type,
        time: time,
        message: punchInfo.message,
        timeValidation: timeValidation.message || null
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
        name: employee.name,
        schedule: schedule ? `${schedule.start_time} - ${schedule.end_time}` : 'Não definido'
      }
    });

  } catch (error) {
    console.error('❌ Erro ao registrar ponto:', error);
    res.status(500).json({ error: 'Erro ao registrar ponto', details: error.message });
  }
});

// Registrar check-in
router.post('/check-in', authenticateToken, async (req, res) => {
  const { employee_id, notes } = req.body;

  try {
    // Verificar se já existe check-in hoje sem check-out
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await pool.query(
      `SELECT * FROM attendance 
       WHERE employee_id = $1 
       AND DATE(check_in) = $2 
       AND check_out IS NULL`,
      [employee_id, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um check-in ativo para hoje' });
    }

    const result = await pool.query(
      'INSERT INTO attendance (employee_id, check_in, notes) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING id',
      [employee_id, notes]
    );

    res.status(201).json({ 
      id: result.rows[0].id, 
      message: 'Check-in registrado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao registrar check-in:', error);
    res.status(500).json({ error: 'Erro ao registrar check-in' });
  }
});

// Registrar check-out
router.post('/check-out', authenticateToken, async (req, res) => {
  const { employee_id, notes } = req.body;

  try {
    // Buscar último check-in sem check-out
    const attendance = await pool.query(
      `SELECT * FROM attendance 
       WHERE employee_id = $1 
       AND check_out IS NULL 
       ORDER BY check_in DESC 
       LIMIT 1`,
      [employee_id]
    );

    if (attendance.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum check-in ativo encontrado' });
    }

    const updateNotes = notes || attendance.rows[0].notes;
    
    await pool.query(
      'UPDATE attendance SET check_out = CURRENT_TIMESTAMP, notes = $1 WHERE id = $2',
      [updateNotes, attendance.rows[0].id]
    );

    res.json({ message: 'Check-out registrado com sucesso' });
  } catch (error) {
    console.error('Erro ao registrar check-out:', error);
    res.status(500).json({ error: 'Erro ao registrar check-out' });
  }
});

// Listar registros de frequência
router.get('/', authenticateToken, checkDepartmentAccess, async (req, res) => {
  const { employee_id, start_date, end_date } = req.query;
  
  try {
    console.log('🔍 Buscando attendance com:', { employee_id, start_date, end_date });
    
    // Buscar direto de attendance_punches com agregação
    let query = `
      WITH daily_punches AS (
        SELECT 
          employee_id,
          date,
          MAX(CASE WHEN punch_type = 'entry' THEN TO_CHAR(punch_time, 'HH24:MI:SS') END) as entry_time,
          MAX(CASE WHEN punch_type = 'break_start' THEN TO_CHAR(punch_time, 'HH24:MI:SS') END) as break_start_time,
          MAX(CASE WHEN punch_type = 'break_end' THEN TO_CHAR(punch_time, 'HH24:MI:SS') END) as break_end_time,
          MAX(CASE WHEN punch_type = 'exit' THEN TO_CHAR(punch_time, 'HH24:MI:SS') END) as exit_time,
          MAX(CASE WHEN punch_type = 'entry' THEN punch_time END) as entry_timestamp,
          MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) as exit_timestamp,
          MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) as break_start_timestamp,
          MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) as break_end_timestamp
        FROM attendance_punches
        WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND employee_id = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    if (start_date) {
      query += ` AND date >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND date <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    query += `
        GROUP BY employee_id, date
      )
      SELECT 
        dp.employee_id,
        dp.date,
        dp.entry_time,
        dp.break_start_time,
        dp.break_end_time,
        dp.exit_time,
        e.name as employee_name,
        p.name as position_name,
        d.name as department_name,
        e.department_id,
        -- Calcular total de horas
        CASE 
          WHEN dp.break_start_timestamp IS NOT NULL AND dp.break_end_timestamp IS NOT NULL AND dp.exit_timestamp IS NOT NULL THEN
            EXTRACT(EPOCH FROM (
              (dp.break_start_timestamp - dp.entry_timestamp) +
              (dp.exit_timestamp - dp.break_end_timestamp)
            )) / 3600
          WHEN dp.exit_timestamp IS NOT NULL THEN
            EXTRACT(EPOCH FROM (dp.exit_timestamp - dp.entry_timestamp)) / 3600
          ELSE NULL
        END as total_hours,
        -- Backward compatibility - retornar timestamp completo para página Attendance
        dp.entry_timestamp as check_in,
        dp.exit_timestamp as check_out
      FROM daily_punches dp
      JOIN employees e ON dp.employee_id = e.id
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN departments d ON e.department_id = d.id
    `;

    // Se é gestor, filtrar apenas seu departamento
    if (req.user.role === 'gestor') {
      query += ` WHERE e.department_id = $${paramCount}`;
      params.push(req.userDepartmentId);
      paramCount++;
    }

    query += ` ORDER BY dp.date DESC`;

    console.log('📝 Query SQL:', query);
    console.log('📌 Parâmetros:', params);

    const result = await pool.query(query, params);
    
    console.log('✅ Registros encontrados:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('📊 Primeiro registro:', {
        date: result.rows[0].date,
        entry: result.rows[0].entry_time,
        exit: result.rows[0].exit_time,
        hours: result.rows[0].total_hours
      });
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar registros:', error);
    res.status(500).json({ error: 'Erro ao buscar registros' });
  }
});

// Estatísticas de frequência
router.get('/stats/:employee_id', authenticateToken, async (req, res) => {
  const { employee_id } = req.params;
  const { month, year } = req.query;

  try {
    let query = `
      SELECT 
        COUNT(*) as total_days,
        COUNT(CASE WHEN exit_time IS NOT NULL THEN 1 END) as complete_days,
        COUNT(CASE WHEN exit_time IS NULL THEN 1 END) as incomplete_days,
        COALESCE(SUM(total_hours), 0) as total_hours
      FROM attendance_daily 
      WHERE employee_id = $1
    `;
    const params = [employee_id];

    if (month && year) {
      query += ` AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`;
      params.push(year, month);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// ADMIN: Listar pontos individuais de um dia
router.get('/punches', authenticateToken, async (req, res) => {
  const { employee_id, date } = req.query;

  try {
    if (!employee_id || !date) {
      return res.status(400).json({ error: 'employee_id e date são obrigatórios' });
    }

    console.log('🔍 Buscando pontos para:', { employee_id, date });

    const result = await pool.query(
      `SELECT 
        id,
        employee_id,
        date,
        TO_CHAR(punch_time, 'HH24:MI:SS') as punch_time_str,
        punch_time,
        punch_type,
        schedule_id,
        created_at
       FROM attendance_punches 
       WHERE employee_id = $1 
       AND date = $2::date
       ORDER BY punch_time ASC`,
      [employee_id, date]
    );

    console.log('✅ Pontos encontrados:', result.rows.length);
    if (result.rows.length > 0) {
      console.log('📋 Primeiro ponto (raw):', result.rows[0]);
    }

    // Retornar com o horário já formatado
    const formattedRows = result.rows.map(row => ({
      ...row,
      punch_time: row.punch_time_str, // Usar o horário formatado
    }));

    res.json(formattedRows);
  } catch (error) {
    console.error('Erro ao buscar pontos:', error);
    res.status(500).json({ error: 'Erro ao buscar pontos' });
  }
});

// ADMIN: Criar ponto manual
router.post('/punches', authenticateToken, async (req, res) => {
  const { employee_id, date, punch_type, time } = req.body;

  try {
    console.log('➕ Criando ponto manual:', { employee_id, date, punch_type, time });

    // Validar campos obrigatórios
    if (!employee_id || !date || !punch_type || !time) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Criar timestamp sem conversão de timezone
    const punchTimestamp = `${date} ${time}`;
    
    console.log('🕐 Timestamp do ponto:', punchTimestamp);

    // Verificar se já existe um ponto do mesmo tipo no mesmo dia
    const existing = await pool.query(
      `SELECT id FROM attendance_punches 
       WHERE employee_id = $1 AND date = $2 AND punch_type = $3`,
      [employee_id, date, punch_type]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Já existe um registro deste tipo para este funcionário nesta data' 
      });
    }

    // Inserir novo ponto
    const result = await pool.query(
      `INSERT INTO attendance_punches (employee_id, date, punch_type, punch_time)
       VALUES ($1, $2, $3, $4::timestamp)
       RETURNING *`,
      [employee_id, date, punch_type, punchTimestamp]
    );

    console.log('✅ Ponto criado com sucesso:', result.rows[0]);

    res.json({ success: true, message: 'Ponto criado com sucesso', punch: result.rows[0] });
  } catch (error) {
    console.error('❌ Erro ao criar ponto:', error);
    
    // Verificar violação de constraint
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ 
        error: 'Já existe um registro deste tipo para este dia' 
      });
    }
    
    res.status(500).json({ error: 'Erro ao criar ponto' });
  }
});

// ADMIN: Atualizar ponto individual
router.put('/punches/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { punch_type, time } = req.body;

  try {
    console.log('🔧 Atualizando ponto:', { id, punch_type, time });

    // Buscar ponto existente
    const existing = await pool.query(
      'SELECT * FROM attendance_punches WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ponto não encontrado' });
    }

    const punch = existing.rows[0];
    console.log('📋 Ponto existente:', { date: punch.date, old_time: punch.punch_time });

    // Criar timestamp sem conversão de timezone
    // O horário já está no fuso correto (America/Rio_Branco)
    const dateStr = typeof punch.date === 'string' 
      ? punch.date.split('T')[0] 
      : punch.date.toISOString().split('T')[0];
    
    const newPunchTimestamp = `${dateStr} ${time}`;
    
    console.log('🕐 Novo timestamp:', newPunchTimestamp);

    // Atualizar sem conversão de timezone
    await pool.query(
      `UPDATE attendance_punches 
       SET punch_type = $1, 
           punch_time = $2::timestamp
       WHERE id = $3`,
      [punch_type, newPunchTimestamp, id]
    );

    console.log('✅ Ponto atualizado com sucesso');

    res.json({ success: true, message: 'Ponto atualizado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao atualizar ponto:', error);
    
    // Verificar violação de constraint
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ 
        error: 'Já existe um registro deste tipo para este dia' 
      });
    }
    
    res.status(500).json({ error: 'Erro ao atualizar ponto' });
  }
});

// ADMIN: Deletar ponto individual
router.delete('/punches/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM attendance_punches WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ponto não encontrado' });
    }

    res.json({ success: true, message: 'Ponto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir ponto:', error);
    res.status(500).json({ error: 'Erro ao excluir ponto' });
  }
});

export default router;
