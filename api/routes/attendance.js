import express from 'express';
import pool, { queryWithRetry } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkDepartmentAccess } from '../middleware/departmentAccess.js';
import logger from '../utils/logger.js';
import {
  getNextPunchType,
  validatePunchTime,
  getEmployeeWithSchedule,
  extractSchedule,
  getTodayPunches,
  formatPunchResponse,
  getLocalDate,
  getLocalTime
} from '../utils/attendanceHelpers.js';
import {
  validateFaceDescriptor,
  getEmployeesWithFace,
  findBestMatch,
  getEmployeeById,
  saveFaceDescriptor
} from '../utils/faceRecognitionHelpers.js';

const router = express.Router();

// ==========================================
// REGISTRO DE PONTO PRINCIPAL
// ==========================================

router.post('/', authenticateToken, async (req, res) => {
  const { employee_id, latitude, longitude, location_accuracy, department_id } = req.body;

  try {
    if (!employee_id) {
      return res.status(400).json({ error: 'employee_id é obrigatório' });
    }

    logger.debug('Registro de ponto', { employee_id, department_id });
    
    // Log de geolocalização se fornecida
    if (latitude && longitude) {
      logger.debug('Localização', { latitude, longitude, location_accuracy });
    }

    // 1. Buscar funcionário com schedule (pode ser específico por departamento)
    const employee = await getEmployeeWithSchedule(employee_id, department_id);
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    if (employee.status === 'inactive') {
      return res.status(403).json({ error: 'Funcionário inativo' });
    }

    // 2. Obter data e hora atuais
    const date = getLocalDate();
    const time = getLocalTime();
    logger.debug('Ponto', { date, time });

    // 3. Verificar último ponto (evitar duplicatas)
    const lastPunch = await pool.query(
      `SELECT punch_time FROM attendance_punches
       WHERE employee_id = $1 AND date = $2
       ORDER BY punch_time DESC LIMIT 1`,
      [employee_id, date]
    );

    if (lastPunch.rows.length > 0) {
      const lastTime = new Date(lastPunch.rows[0].punch_time);
      const diffSeconds = (new Date() - lastTime) / 1000;

      if (diffSeconds < 60) {
        return res.status(400).json({
          error: 'Ponto já registrado há menos de 1 minuto',
          lastPunch: lastTime
        });
      }
    }

    // 4. Determinar próximo tipo de ponto
    const schedule = extractSchedule(employee);
    const punchInfo = await getNextPunchType(employee_id, date, schedule);

    if (!punchInfo.type) {
      return res.status(400).json({
        error: 'Todos os pontos do dia já foram registrados',
        message: 'Você já completou todos os registros de hoje'
      });
    }

    logger.debug('Tipo de ponto', { type: punchInfo.type });

    // 5. Validar horário
    const timeValidation = validatePunchTime(punchInfo.type, time, schedule, 30);

    // 6. Registrar o ponto (com geolocalização e department_id se disponível)
    const useDeptId = department_id || employee.department_id;
    
    const insertQuery = latitude && longitude
      ? `INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type, schedule_id, department_id, latitude, longitude, location_accuracy)
         VALUES ($1, $2, CURRENT_TIMESTAMP AT TIME ZONE 'America/Rio_Branco', $3, $4, $5, $6, $7, $8)
         RETURNING *`
      : `INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type, schedule_id, department_id)
         VALUES ($1, $2, CURRENT_TIMESTAMP AT TIME ZONE 'America/Rio_Branco', $3, $4, $5)
         RETURNING *`;
    
    const insertParams = latitude && longitude
      ? [employee_id, date, punchInfo.type, employee.schedule_id, useDeptId, latitude, longitude, location_accuracy]
      : [employee_id, date, punchInfo.type, employee.schedule_id, useDeptId];

    await pool.query(insertQuery, insertParams);

    logger.debug('Ponto registrado', { type: punchInfo.type, time });

    // 7. Buscar todos os pontos de hoje
    const todayPunches = await getTodayPunches(employee_id, date);

    // 8. Retornar resposta formatada
    const response = formatPunchResponse(punchInfo, timeValidation, todayPunches, employee, schedule);
    res.status(201).json(response);

  } catch (error) {
    logger.error('Erro ao registrar ponto', error);
    res.status(500).json({ error: 'Erro ao registrar ponto', details: error.message });
  }
});

// ==========================================
// CHECK-IN/CHECK-OUT LEGADOS
// ==========================================

router.post('/check-in', authenticateToken, async (req, res) => {
  const { employee_id, notes } = req.body;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await pool.query(
      `SELECT * FROM attendance 
       WHERE employee_id = $1 AND DATE(check_in) = $2 AND check_out IS NULL`,
      [employee_id, today]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um check-in ativo para hoje' });
    }

    const result = await pool.query(
      'INSERT INTO attendance (employee_id, check_in, notes) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING id',
      [employee_id, notes]
    );

    res.status(201).json({ id: result.rows[0].id, message: 'Check-in registrado com sucesso' });
  } catch (error) {
    logger.error('Erro ao registrar check-in', error);
    res.status(500).json({ error: 'Erro ao registrar check-in' });
  }
});

router.post('/check-out', authenticateToken, async (req, res) => {
  const { employee_id, notes } = req.body;

  try {
    const attendance = await pool.query(
      `SELECT * FROM attendance 
       WHERE employee_id = $1 AND check_out IS NULL 
       ORDER BY check_in DESC LIMIT 1`,
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
    logger.error('Erro ao registrar check-out', error);
    res.status(500).json({ error: 'Erro ao registrar check-out' });
  }
});

// ==========================================
// LISTAGEM E ESTATÍSTICAS
// ==========================================

router.get('/', authenticateToken, checkDepartmentAccess, async (req, res) => {
  const { employee_id, start_date, end_date } = req.query;
  
  try {
    let query = `
      WITH daily_punches AS (
        SELECT 
          employee_id, date,
          MAX(CASE WHEN punch_type = 'entry' THEN TO_CHAR(punch_time, 'HH24:MI:SS') END) as entry_time,
          MAX(CASE WHEN punch_type = 'break_start' THEN TO_CHAR(punch_time, 'HH24:MI:SS') END) as break_start_time,
          MAX(CASE WHEN punch_type = 'break_end' THEN TO_CHAR(punch_time, 'HH24:MI:SS') END) as break_end_time,
          MAX(CASE WHEN punch_type = 'exit' THEN TO_CHAR(punch_time, 'HH24:MI:SS') END) as exit_time,
          MAX(CASE WHEN punch_type = 'entry' THEN punch_time END) as entry_timestamp,
          MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) as exit_timestamp,
          MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) as break_start_timestamp,
          MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) as break_end_timestamp
        FROM attendance_punches WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (employee_id) {
      query += ` AND employee_id = $${paramCount++}`;
      params.push(employee_id);
    }
    if (start_date) {
      query += ` AND date >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND date <= $${paramCount++}`;
      params.push(end_date);
    }

    query += `
        GROUP BY employee_id, date
      )
      SELECT dp.*, e.name as employee_name, p.name as position_name, d.name as department_name, e.department_id,
        CASE 
          WHEN dp.break_start_timestamp IS NOT NULL AND dp.break_end_timestamp IS NOT NULL AND dp.exit_timestamp IS NOT NULL THEN
            EXTRACT(EPOCH FROM ((dp.break_start_timestamp - dp.entry_timestamp) + (dp.exit_timestamp - dp.break_end_timestamp))) / 3600
          WHEN dp.exit_timestamp IS NOT NULL THEN
            EXTRACT(EPOCH FROM (dp.exit_timestamp - dp.entry_timestamp)) / 3600
          ELSE NULL
        END as total_hours,
        dp.entry_timestamp as check_in, dp.exit_timestamp as check_out
      FROM daily_punches dp
      JOIN employees e ON dp.employee_id = e.id
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN departments d ON e.department_id = d.id
    `;

    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      query += ` WHERE e.department_id = ANY($${paramCount++})`;
      params.push(deptIds);
    }

    query += ` ORDER BY dp.date DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar registros', error);
    res.status(500).json({ error: 'Erro ao buscar registros' });
  }
});

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
      FROM attendance_daily WHERE employee_id = $1
    `;
    const params = [employee_id];

    if (month && year) {
      query += ` AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`;
      params.push(year, month);
    }

    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao buscar estatísticas', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// ==========================================
// DADOS SEMANAIS PARA GRÁFICO
// ==========================================

router.get('/weekly-stats', authenticateToken, async (req, res) => {
  try {
    // Buscar total de funcionários ativos
    const employeesResult = await pool.query(
      `SELECT COUNT(*) as total FROM employees WHERE status = 'active'`
    );
    const totalEmployees = parseInt(employeesResult.rows[0].total) || 1;

    // Buscar presença dos últimos 7 dias
    const result = await pool.query(`
      SELECT 
        date::date as date,
        COUNT(DISTINCT employee_id) as present_count
      FROM attendance_punches
      WHERE date >= CURRENT_DATE - INTERVAL '6 days'
        AND date <= CURRENT_DATE
        AND punch_type = 'entry'
      GROUP BY date::date
      ORDER BY date ASC
    `);

    // Criar mapa de presença por data
    const presenceMap = new Map();
    result.rows.forEach(row => {
      const dateStr = row.date.toISOString().split('T')[0];
      presenceMap.set(dateStr, parseInt(row.present_count));
    });

    // Gerar dados para os últimos 7 dias
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      let presentCount = presenceMap.get(dateStr) || 0;
      let rate = 0;
      
      if (!isWeekend && totalEmployees > 0) {
        rate = Math.round((presentCount / totalEmployees) * 100);
      }

      weekData.push({
        date: dateStr,
        dayOfWeek,
        isWeekend,
        presentCount,
        totalEmployees,
        rate
      });
    }

    res.json(weekData);
  } catch (error) {
    logger.error('Erro ao buscar estatísticas semanais', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas semanais' });
  }
});

// ==========================================
// BANCO DE HORAS
// ==========================================

router.get('/hour-bank/:employee_id', authenticateToken, async (req, res) => {
  const { employee_id } = req.params;
  const { month, year } = req.query;
  
  const currentMonth = month || new Date().getMonth() + 1;
  const currentYear = year || new Date().getFullYear();

  try {
    // Buscar funcionário e sua jornada (com retry para evitar too many clients)
    const employeeResult = await queryWithRetry(`
      SELECT 
        e.*, 
        s.name as schedule_name,
        s.start_time,
        s.end_time,
        s.break_start,
        s.break_end,
        s.workdays
      FROM employees e
      LEFT JOIN schedules s ON e.schedule_id = s.id
      WHERE e.id = $1
    `, [employee_id]);

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const employee = employeeResult.rows[0];
    
    // Calcular horas de trabalho diárias a partir do horário
    let dailyWorkHours = 8; // Padrão 8h
    if (employee.start_time && employee.end_time) {
      const start = employee.start_time.split(':');
      const end = employee.end_time.split(':');
      const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
      let totalMinutes = endMinutes - startMinutes;
      
      // Descontar intervalo se existir
      if (employee.break_start && employee.break_end) {
        const breakStart = employee.break_start.split(':');
        const breakEnd = employee.break_end.split(':');
        const breakStartMinutes = parseInt(breakStart[0]) * 60 + parseInt(breakStart[1]);
        const breakEndMinutes = parseInt(breakEnd[0]) * 60 + parseInt(breakEnd[1]);
        totalMinutes -= (breakEndMinutes - breakStartMinutes);
      }
      
      dailyWorkHours = Math.round(totalMinutes / 60 * 10) / 10; // Arredondar para 1 casa decimal
    }
    
    // Dias de trabalho configurados (padrão seg-sex)
    const workdays = employee.workdays || ['1', '2', '3', '4', '5'];

    // Buscar todos os registros do mês (com retry)
    const attendanceResult = await queryWithRetry(`
      SELECT 
        date,
        MIN(CASE WHEN punch_type = 'entry' THEN punch_time END) as entry_time,
        MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) as exit_time,
        MIN(CASE WHEN punch_type = 'break_start' THEN punch_time END) as break_start,
        MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) as break_end
      FROM attendance_punches
      WHERE employee_id = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND EXTRACT(YEAR FROM date) = $3
      GROUP BY date
      ORDER BY date
    `, [employee_id, currentMonth, currentYear]);

    let totalWorkedMinutes = 0;
    let expectedMinutes = 0;
    const dailyDetails = [];

    attendanceResult.rows.forEach(row => {
      const dayOfWeek = new Date(row.date).getDay();
      const isWorkday = workdays.includes(String(dayOfWeek));
      
      if (isWorkday) {
        expectedMinutes += dailyWorkHours * 60;
      }

      if (row.entry_time && row.exit_time) {
        const entry = new Date(row.entry_time);
        const exit = new Date(row.exit_time);
        let worked = (exit - entry) / (1000 * 60); // Minutos

        // Descontar intervalo se existir
        if (row.break_start && row.break_end) {
          const breakStart = new Date(row.break_start);
          const breakEnd = new Date(row.break_end);
          const breakDuration = (breakEnd - breakStart) / (1000 * 60);
          worked -= breakDuration;
        }

        totalWorkedMinutes += Math.max(0, worked);
        
        const balance = worked - (isWorkday ? dailyWorkHours * 60 : 0);
        dailyDetails.push({
          date: row.date,
          worked: Math.round(worked),
          expected: isWorkday ? dailyWorkHours * 60 : 0,
          balance: Math.round(balance),
          isWorkday
        });
      } else if (isWorkday) {
        // Dia útil sem registro completo
        dailyDetails.push({
          date: row.date,
          worked: 0,
          expected: dailyWorkHours * 60,
          balance: -dailyWorkHours * 60,
          isWorkday: true,
          incomplete: true
        });
      }
    });

    const balanceMinutes = Math.round(totalWorkedMinutes - expectedMinutes);
    const balanceHours = Math.floor(Math.abs(balanceMinutes) / 60);
    const balanceMins = Math.round(Math.abs(balanceMinutes) % 60);

    res.json({
      employee: {
        id: employee.id,
        name: employee.name,
        schedule: employee.schedule_name,
        dailyWorkHours
      },
      summary: {
        month: currentMonth,
        year: currentYear,
        totalWorkedMinutes: Math.round(totalWorkedMinutes),
        totalWorkedHours: Math.round(totalWorkedMinutes / 60 * 10) / 10,
        expectedMinutes: Math.round(expectedMinutes),
        expectedHours: Math.round(expectedMinutes / 60),
        balanceMinutes: balanceMinutes,
        balanceFormatted: `${balanceMinutes >= 0 ? '+' : '-'}${balanceHours}h${balanceMins.toString().padStart(2, '0')}min`,
        isPositive: balanceMinutes >= 0
      },
      dailyDetails
    });
  } catch (error) {
    logger.error('Erro ao calcular banco de horas', error);
    res.status(500).json({ error: 'Erro ao calcular banco de horas' });
  }
});

// ==========================================
// ADMIN: CRUD DE PONTOS INDIVIDUAIS
// ==========================================

router.get('/punches', authenticateToken, async (req, res) => {
  const { employee_id, date } = req.query;

  try {
    if (!employee_id || !date) {
      return res.status(400).json({ error: 'employee_id e date são obrigatórios' });
    }

    const result = await pool.query(
      `SELECT id, employee_id, date, TO_CHAR(punch_time, 'HH24:MI:SS') as punch_time_str,
              punch_time, punch_type, schedule_id, created_at
       FROM attendance_punches WHERE employee_id = $1 AND date = $2::date
       ORDER BY punch_time ASC`,
      [employee_id, date]
    );

    const formattedRows = result.rows.map(row => ({
      ...row,
      punch_time: row.punch_time_str,
    }));

    res.json(formattedRows);
  } catch (error) {
    logger.error('Erro ao buscar pontos', error);
    res.status(500).json({ error: 'Erro ao buscar pontos' });
  }
});

router.post('/punches', authenticateToken, async (req, res) => {
  const { employee_id, date, punch_type, time } = req.body;

  try {
    if (!employee_id || !date || !punch_type || !time) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

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

    const punchTimestamp = `${date} ${time}`;
    const result = await pool.query(
      `INSERT INTO attendance_punches (employee_id, date, punch_type, punch_time)
       VALUES ($1, $2, $3, $4::timestamp) RETURNING *`,
      [employee_id, date, punch_type, punchTimestamp]
    );

    res.json({ success: true, message: 'Ponto criado com sucesso', punch: result.rows[0] });
  } catch (error) {
    logger.error('Erro ao criar ponto', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe um registro deste tipo para este dia' });
    }
    
    res.status(500).json({ error: 'Erro ao criar ponto' });
  }
});

router.put('/punches/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { punch_type, time } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM attendance_punches WHERE id = $1', [id]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ponto não encontrado' });
    }

    const punch = existing.rows[0];
    const dateStr = typeof punch.date === 'string' 
      ? punch.date.split('T')[0] 
      : punch.date.toISOString().split('T')[0];
    
    const newPunchTimestamp = `${dateStr} ${time}`;

    await pool.query(
      `UPDATE attendance_punches SET punch_type = $1, punch_time = $2::timestamp WHERE id = $3`,
      [punch_type, newPunchTimestamp, id]
    );

    res.json({ success: true, message: 'Ponto atualizado com sucesso' });
  } catch (error) {
    logger.error('Erro ao atualizar ponto', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Já existe um registro deste tipo para este dia' });
    }
    
    res.status(500).json({ error: 'Erro ao atualizar ponto' });
  }
});

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
    logger.error('Erro ao excluir ponto', error);
    res.status(500).json({ error: 'Erro ao excluir ponto' });
  }
});

// ==========================================
// RECONHECIMENTO FACIAL
// ==========================================

router.post('/face-verify', authenticateToken, async (req, res) => {
  try {
    logger.debug('Iniciando verificação facial');
    
    const { faceDescriptor } = req.body;
    
    // Validar descriptor
    const validation = validateFaceDescriptor(faceDescriptor);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, details: validation.details });
    }

    logger.debug('Descriptor válido', { length: faceDescriptor.length });

    // Buscar funcionários com face cadastrada
    const employees = await getEmployeesWithFace();
    logger.debug('Funcionários com face', { count: employees.length });

    if (employees.length === 0) {
      return res.status(404).json({ 
        error: 'Nenhum funcionário com reconhecimento facial cadastrado.',
        hint: 'Vá em Funcionários → Clique no ícone de câmera para cadastrar uma face',
        verified: false 
      });
    }

    // Encontrar melhor match
    const { bestMatch, bestDistance, threshold } = findBestMatch(faceDescriptor, employees);

    if (bestMatch) {
      logger.debug('Match encontrado', { name: bestMatch.name, distance: bestDistance.toFixed(3) });
      return res.json({
        verified: true,
        employee: { id: bestMatch.id, name: bestMatch.name, cpf: bestMatch.cpf },
        confidence: (1 - bestDistance).toFixed(2)
      });
    } else {
      logger.debug('Nenhum match encontrado', { bestDistance: bestDistance.toFixed(3) });
      return res.status(404).json({
        error: 'Face não reconhecida.',
        hint: 'Certifique-se de ter cadastrado sua face em Funcionários → ícone de câmera',
        details: `Melhor similaridade: ${((1 - bestDistance) * 100).toFixed(1)}% (mínimo necessário: ${((1 - threshold) * 100).toFixed(1)}%)`,
        verified: false
      });
    }
  } catch (error) {
    logger.error('Erro ao verificar face', error);
    res.status(500).json({ 
      error: 'Erro ao verificar reconhecimento facial',
      details: error.message,
      hint: 'Verifique os logs do servidor para mais detalhes'
    });
  }
});

router.post('/face-register', authenticateToken, async (req, res) => {
  const { employee_id, faceDescriptor } = req.body;

  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem registrar faces' });
    }

    const validation = validateFaceDescriptor(faceDescriptor);
    if (!employee_id || !validation.valid) {
      return res.status(400).json({ error: 'employee_id e faceDescriptor válido são obrigatórios' });
    }

    const employee = await getEmployeeById(employee_id);
    if (!employee) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    logger.debug('Registrando face', { employee_id, name: employee.name });

    await saveFaceDescriptor(employee_id, faceDescriptor);

    res.json({
      success: true,
      message: `Reconhecimento facial registrado para ${employee.name}`,
      employee
    });
  } catch (error) {
    logger.error('Erro ao registrar face', error);
    
    if (error.message?.includes('face_descriptor')) {
      return res.status(500).json({ 
        error: 'Coluna face_descriptor não encontrada. Execute a migração.',
        details: error.message
      });
    }
    
    res.status(500).json({ error: 'Erro ao registrar reconhecimento facial', details: error.message });
  }
});

// ==========================================
// RELATÓRIO COM MULTI-DEPARTAMENTOS
// ==========================================

// GET /api/attendance/report - Busca dados para relatório considerando multi-departamentos
router.get('/report', authenticateToken, async (req, res) => {
  const { start_date, end_date, department_id } = req.query;

  try {
    // Query que considera múltiplos departamentos via employee_departments
    // Se department_id é especificado, filtra TAMBÉM os registros de ponto por esse departamento
    let query = `
      WITH daily_punches AS (
        SELECT 
          ap.employee_id,
          ap.date,
          ap.department_id as punch_department_id,
          MIN(CASE WHEN ap.punch_type = 'entry' THEN ap.punch_time END) as entry_timestamp,
          MIN(CASE WHEN ap.punch_type = 'break_start' THEN ap.punch_time END) as break_start_timestamp,
          MIN(CASE WHEN ap.punch_type = 'break_end' THEN ap.punch_time END) as break_end_timestamp,
          MAX(CASE WHEN ap.punch_type = 'exit' THEN ap.punch_time END) as exit_timestamp,
          TO_CHAR(MIN(CASE WHEN ap.punch_type = 'entry' THEN ap.punch_time END), 'HH24:MI') as entry_time,
          TO_CHAR(MIN(CASE WHEN ap.punch_type = 'break_start' THEN ap.punch_time END), 'HH24:MI') as break_start_time,
          TO_CHAR(MIN(CASE WHEN ap.punch_type = 'break_end' THEN ap.punch_time END), 'HH24:MI') as break_end_time,
          TO_CHAR(MAX(CASE WHEN ap.punch_type = 'exit' THEN ap.punch_time END), 'HH24:MI') as exit_time
        FROM attendance_punches ap
        WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (start_date) {
      query += ` AND ap.date >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND ap.date <= $${paramCount++}`;
      params.push(end_date);
    }
    
    // Filtrar registros de ponto pelo departamento selecionado
    if (department_id) {
      query += ` AND (ap.department_id = $${paramCount++} OR ap.department_id IS NULL)`;
      params.push(parseInt(department_id));
    }

    query += `
        GROUP BY ap.employee_id, ap.date, ap.department_id
      ),
      employee_depts AS (
        SELECT 
          e.id as employee_id,
          e.name as employee_name,
          e.department_id as primary_department_id,
          pd.name as primary_department_name,
          COALESCE(
            (SELECT array_agg(DISTINCT ed.department_id) 
             FROM employee_departments ed 
             WHERE ed.employee_id = e.id),
            ARRAY[e.department_id]
          ) as all_department_ids,
          COALESCE(
            (SELECT array_agg(DISTINCT d.name) 
             FROM employee_departments ed 
             JOIN departments d ON ed.department_id = d.id
             WHERE ed.employee_id = e.id),
            ARRAY[pd.name]
          ) as all_department_names
        FROM employees e
        LEFT JOIN departments pd ON e.department_id = pd.id
        WHERE e.status = 'active'
      )
      SELECT 
        dp.*,
        ed.employee_name,
        COALESCE(dp.punch_department_id, ed.primary_department_id) as department_id,
        COALESCE(
          (SELECT name FROM departments WHERE id = dp.punch_department_id),
          ed.primary_department_name
        ) as department_name,
        ed.all_department_ids,
        ed.all_department_names,
        CASE 
          WHEN dp.break_start_timestamp IS NOT NULL AND dp.break_end_timestamp IS NOT NULL AND dp.exit_timestamp IS NOT NULL THEN
            EXTRACT(EPOCH FROM ((dp.break_start_timestamp - dp.entry_timestamp) + (dp.exit_timestamp - dp.break_end_timestamp))) / 3600
          WHEN dp.exit_timestamp IS NOT NULL THEN
            EXTRACT(EPOCH FROM (dp.exit_timestamp - dp.entry_timestamp)) / 3600
          ELSE NULL
        END as total_hours,
        dp.entry_timestamp as check_in, 
        dp.exit_timestamp as check_out
      FROM daily_punches dp
      JOIN employee_depts ed ON dp.employee_id = ed.employee_id
    `;

    // Filtrar funcionários que pertencem ao departamento
    if (department_id) {
      query += ` WHERE $${paramCount++} = ANY(ed.all_department_ids)`;
      params.push(parseInt(department_id));
    }

    // Filtro de gestor - considera múltiplos departamentos
    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      if (department_id) {
        query += ` AND ed.all_department_ids && $${paramCount++}`;
      } else {
        query += ` WHERE ed.all_department_ids && $${paramCount++}`;
      }
      params.push(deptIds);
    }

    query += ` ORDER BY dp.date DESC, ed.employee_name`;

    const result = await queryWithRetry(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar relatório', error);
    res.status(500).json({ error: 'Erro ao buscar relatório', details: error.message });
  }
});

// GET /api/attendance/employees-by-department - Lista funcionários por departamento (multi-dept)
router.get('/employees-by-department', authenticateToken, async (req, res) => {
  const { department_id } = req.query;

  try {
    let query = `
      SELECT DISTINCT
        e.id,
        e.name,
        e.department_id as primary_department_id,
        pd.name as primary_department_name,
        COALESCE(
          (SELECT array_agg(DISTINCT ed.department_id) 
           FROM employee_departments ed 
           WHERE ed.employee_id = e.id),
          ARRAY[e.department_id]
        ) as all_department_ids,
        COALESCE(
          (SELECT array_agg(DISTINCT d.name) 
           FROM employee_departments ed 
           JOIN departments d ON ed.department_id = d.id
           WHERE ed.employee_id = e.id),
          ARRAY[pd.name]
        ) as all_department_names
      FROM employees e
      LEFT JOIN departments pd ON e.department_id = pd.id
      WHERE e.status = 'active'
    `;

    const params = [];
    let paramCount = 1;

    if (department_id) {
      query += `
        AND (
          e.department_id = $${paramCount}
          OR EXISTS (
            SELECT 1 FROM employee_departments ed 
            WHERE ed.employee_id = e.id AND ed.department_id = $${paramCount}
          )
        )
      `;
      params.push(parseInt(department_id));
      paramCount++;
    }

    // Filtro de gestor
    if (req.user.role === 'gestor') {
      const deptIds = req.userDepartmentIds || [req.userDepartmentId];
      query += `
        AND (
          e.department_id = ANY($${paramCount})
          OR EXISTS (
            SELECT 1 FROM employee_departments ed 
            WHERE ed.employee_id = e.id AND ed.department_id = ANY($${paramCount})
          )
        )
      `;
      params.push(deptIds);
    }

    query += ` ORDER BY e.name`;

    const result = await queryWithRetry(query, params);
    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar funcionários por departamento', error);
    res.status(500).json({ error: 'Erro ao buscar funcionários', details: error.message });
  }
});

// GET /api/attendance/individual-report - Busca dados para relatório individual por departamento
// Retorna dados separados por departamento se o funcionário tem múltiplos
router.get('/individual-report', authenticateToken, async (req, res) => {
  const { employee_id, start_date, end_date, department_id } = req.query;

  try {
    if (!employee_id) {
      return res.status(400).json({ error: 'employee_id é obrigatório' });
    }

    // Verificar se a coluna department_id existe na tabela attendance_punches
    let hasDepartmentColumn = false;
    try {
      const checkColumn = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'attendance_punches' AND column_name = 'department_id'
      `);
      hasDepartmentColumn = checkColumn.rows.length > 0;
    } catch (e) {
      logger.warn('Não foi possível verificar coluna department_id:', e.message);
    }

    // Query que busca os registros de ponto filtrados por departamento se especificado
    let query = `
      SELECT 
        ap.employee_id,
        ap.date,
        ${hasDepartmentColumn ? 'ap.department_id as punch_department_id,' : ''}
        TO_CHAR(MIN(CASE WHEN ap.punch_type = 'entry' THEN ap.punch_time END), 'HH24:MI') as entry_time,
        TO_CHAR(MIN(CASE WHEN ap.punch_type = 'break_start' THEN ap.punch_time END), 'HH24:MI') as break_start_time,
        TO_CHAR(MIN(CASE WHEN ap.punch_type = 'break_end' THEN ap.punch_time END), 'HH24:MI') as break_end_time,
        TO_CHAR(MAX(CASE WHEN ap.punch_type = 'exit' THEN ap.punch_time END), 'HH24:MI') as exit_time,
        MIN(CASE WHEN ap.punch_type = 'entry' THEN ap.punch_time END) as check_in,
        MAX(CASE WHEN ap.punch_type = 'exit' THEN ap.punch_time END) as check_out,
        CASE 
          WHEN MIN(CASE WHEN ap.punch_type = 'break_start' THEN ap.punch_time END) IS NOT NULL 
            AND MIN(CASE WHEN ap.punch_type = 'break_end' THEN ap.punch_time END) IS NOT NULL 
            AND MAX(CASE WHEN ap.punch_type = 'exit' THEN ap.punch_time END) IS NOT NULL 
          THEN
            EXTRACT(EPOCH FROM (
              (MIN(CASE WHEN ap.punch_type = 'break_start' THEN ap.punch_time END) - MIN(CASE WHEN ap.punch_type = 'entry' THEN ap.punch_time END)) +
              (MAX(CASE WHEN ap.punch_type = 'exit' THEN ap.punch_time END) - MIN(CASE WHEN ap.punch_type = 'break_end' THEN ap.punch_time END))
            )) / 3600
          WHEN MAX(CASE WHEN ap.punch_type = 'exit' THEN ap.punch_time END) IS NOT NULL 
          THEN
            EXTRACT(EPOCH FROM (MAX(CASE WHEN ap.punch_type = 'exit' THEN ap.punch_time END) - MIN(CASE WHEN ap.punch_type = 'entry' THEN ap.punch_time END))) / 3600
          ELSE NULL
        END as total_hours
      FROM attendance_punches ap
      WHERE ap.employee_id = $1
    `;

    const params = [parseInt(employee_id)];
    let paramCount = 2;

    if (start_date) {
      query += ` AND ap.date >= $${paramCount++}`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND ap.date <= $${paramCount++}`;
      params.push(end_date);
    }
    
    // Filtrar por departamento se a coluna existir E um departamento foi selecionado
    if (hasDepartmentColumn && department_id) {
      query += ` AND ap.department_id = $${paramCount++}`;
      params.push(parseInt(department_id));
    }

    // GROUP BY inclui department_id se existir
    if (hasDepartmentColumn) {
      query += ` GROUP BY ap.employee_id, ap.date, ap.department_id ORDER BY ap.date`;
    } else {
      query += ` GROUP BY ap.employee_id, ap.date ORDER BY ap.date`;
    }

    const result = await queryWithRetry(query, params);
    
    // Se um departamento foi selecionado mas a coluna não existe, retornar vazio
    // (porque não temos como saber em qual departamento o ponto foi batido)
    let records = result.rows;
    if (department_id && !hasDepartmentColumn) {
      // Não podemos filtrar, então informamos que precisa da migração
      logger.warn('Filtro por departamento solicitado mas coluna department_id não existe em attendance_punches');
      // Retorna os registros mesmo assim, mas o frontend deve saber que não está filtrado
    }
    
    // Buscar departamentos do funcionário (se a tabela existir)
    let deptResult = { rows: [] };
    try {
      const deptQuery = `
        SELECT 
          ed.department_id,
          d.name as department_name,
          s.name as schedule_name,
          ed.is_primary
        FROM employee_departments ed
        JOIN departments d ON ed.department_id = d.id
        LEFT JOIN schedules s ON ed.schedule_id = s.id
        WHERE ed.employee_id = $1
        ORDER BY ed.is_primary DESC, d.name
      `;
      deptResult = await queryWithRetry(deptQuery, [parseInt(employee_id)]);
    } catch (deptError) {
      logger.warn('Tabela employee_departments pode não existir:', deptError.message);
    }

    res.json({
      records: records,
      departments: deptResult.rows,
      filterByDepartmentSupported: hasDepartmentColumn
    });
  } catch (error) {
    logger.error('Erro ao buscar relatório individual', error);
    res.status(500).json({ error: 'Erro ao buscar relatório individual', details: error.message });
  }
});

export default router;
