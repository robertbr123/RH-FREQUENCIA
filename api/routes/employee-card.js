import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting simples (em memória)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 5;

const checkRateLimit = (ip) => {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
};

// ===============================================
// Endpoint para Scanner - Busca rápida por CPF ou Matrícula
// Retorna apenas dados essenciais para registro de ponto
// ===============================================
router.get('/find', authenticateToken, async (req, res) => {
  const { q } = req.query; // q = CPF ou matrícula

  try {
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ 
        success: false,
        error: 'Digite ao menos 3 caracteres' 
      });
    }

    const input = q.replace(/\D/g, ''); // Apenas números
    
    // Buscar por ID (matrícula) ou CPF
    const result = await pool.query(
      `SELECT id, name, cpf, status, photo_url
       FROM employees 
       WHERE (
         id::text = $1 
         OR REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = $1
       )
       AND status = 'active'
       LIMIT 1`,
      [input]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Funcionário não encontrado ou inativo' 
      });
    }

    const emp = result.rows[0];
    
    res.json({
      success: true,
      employee: {
        id: emp.id,
        name: emp.name,
        cpf: emp.cpf
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar funcionário:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar funcionário' 
    });
  }
});

// Endpoint PÚBLICO - Consulta de frequência por CPF
router.post('/check-attendance', async (req, res) => {
  const { cpf, month } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.ip || 'unknown';

  try {
    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ 
        success: false,
        message: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' 
      });
    }

    // Validar CPF
    if (!cpf || cpf.length !== 11 || !/^\d{11}$/.test(cpf)) {
      return res.status(400).json({ 
        success: false,
        message: 'CPF inválido. Digite apenas os 11 dígitos.' 
      });
    }

    // Buscar funcionário por CPF
    const empResult = await pool.query(
      `SELECT 
        e.id, e.name, e.status, e.photo_url, e.schedule_id,
        p.name as position_name, d.name as department_name,
        LPAD(e.id::text, 6, '0') as matricula
      FROM employees e
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE REPLACE(REPLACE(REPLACE(e.cpf, '.', ''), '-', ''), ' ', '') = $1`,
      [cpf]
    );

    if (empResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: 'CPF não encontrado.'
      });
    }

    const emp = empResult.rows[0];

    if (emp.status !== 'active') {
      return res.status(403).json({ 
        success: false,
        message: 'Funcionário inativo.'
      });
    }

    // Datas - usar mês enviado pelo frontend se disponível
    let targetDate;
    if (month) {
      // month vem como 'YYYY-MM'
      const [year, monthNum] = month.split('-').map(Number);
      targetDate = new Date(year, monthNum - 1, 1);
    } else {
      targetDate = new Date();
    }
    
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).toISOString().split('T')[0];
    const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    
    console.log('📅 Buscando frequência:', { cpf, month, startDate, endDate, monthStr });

    // Buscar punches
    const punchesRes = await pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, punch_type, TO_CHAR(punch_time, 'HH24:MI:SS') as punch_time
       FROM attendance_punches
       WHERE employee_id = $1 AND date >= $2::date AND date <= $3::date
       ORDER BY date DESC, punch_time ASC`,
      [emp.id, startDate, endDate]
    );

    // Agrupar punches por dia
    const dailyRecords = {};
    punchesRes.rows.forEach(punch => {
      if (!dailyRecords[punch.date]) {
        dailyRecords[punch.date] = { date: punch.date, check_in: null, check_out: null, break_start: null, break_end: null, hours: 0 };
      }
      if (punch.punch_type === 'entry') dailyRecords[punch.date].check_in = punch.punch_time;
      if (punch.punch_type === 'exit') dailyRecords[punch.date].check_out = punch.punch_time;
      if (punch.punch_type === 'break_start') dailyRecords[punch.date].break_start = punch.punch_time;
      if (punch.punch_type === 'break_end') dailyRecords[punch.date].break_end = punch.punch_time;
    });

    // Calcular horas
    Object.values(dailyRecords).forEach(rec => {
      if (rec.check_in && rec.check_out) {
        const [eH, eM] = rec.check_in.split(':').map(Number);
        const [xH, xM] = rec.check_out.split(':').map(Number);
        let mins = (xH * 60 + xM) - (eH * 60 + eM);
        
        if (rec.break_start && rec.break_end) {
          const [bsH, bsM] = rec.break_start.split(':').map(Number);
          const [beH, beM] = rec.break_end.split(':').map(Number);
          mins -= (beH * 60 + beM) - (bsH * 60 + bsM);
        }
        rec.hours = parseFloat((mins / 60).toFixed(2));
      }
    });

    // Buscar schedule
    let workdaySet = new Set();
    if (emp.schedule_id) {
      const schRes = await pool.query(`SELECT workdays FROM schedules WHERE id = $1`, [emp.schedule_id]);
      if (schRes.rows.length > 0) {
        let wd = schRes.rows[0].workdays;
        if (typeof wd === 'string') wd = JSON.parse(wd);
        if (Array.isArray(wd)) {
          workdaySet = new Set(wd.map(d => typeof d === 'string' ? parseInt(d) : d).filter(d => !isNaN(d)));
        }
      }
    }

    // Buscar férias do funcionário no mês
    const vacationsRes = await pool.query(
      `SELECT start_date, end_date, days
       FROM employee_vacations
       WHERE employee_id = $1 
         AND ((start_date <= $3::date AND end_date >= $2::date))`,
      [emp.id, startDate, endDate]
    );

    // Criar set de dias em férias
    const vacationDays = new Set();
    vacationsRes.rows.forEach(vac => {
      const vacStart = new Date(vac.start_date);
      const vacEnd = new Date(vac.end_date);
      const monthStart = new Date(startDate);
      const monthEnd = new Date(endDate);
      
      // Iterar pelos dias de férias que estão dentro do mês
      for (let d = new Date(Math.max(vacStart.getTime(), monthStart.getTime())); 
           d <= Math.min(vacEnd.getTime(), monthEnd.getTime()); 
           d.setDate(d.getDate() + 1)) {
        vacationDays.add(d.toISOString().split('T')[0]);
      }
    });

    // Buscar feriados do mês
    const holidaysRes = await pool.query(
      `SELECT TO_CHAR(date, 'YYYY-MM-DD') as date, name
       FROM holidays
       WHERE date >= $1::date AND date <= $2::date`,
      [startDate, endDate]
    );

    const holidayDays = new Set(holidaysRes.rows.map(h => h.date));
    const holidayNames = {};
    holidaysRes.rows.forEach(h => holidayNames[h.date] = h.name);

    // Calcular faltas (apenas dias de trabalho, excluindo férias e feriados)
    let absentDays = 0;
    let vacationCount = 0;
    let holidayCount = 0;
    const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    const today = new Date();
    const isFutureMonth = targetDate > today;
    const maxDay = (targetDate.getFullYear() === today.getFullYear() && targetDate.getMonth() === today.getMonth()) 
      ? today.getDate() 
      : daysInMonth;
    
    // Criar registros para dias de férias e feriados
    const specialDays = {};
    
    // Se for mês futuro, não calcular faltas
    if (!isFutureMonth) {
      for (let d = 1; d <= maxDay; d++) {
        const day = new Date(targetDate.getFullYear(), targetDate.getMonth(), d);
        const dateStr = day.toISOString().split('T')[0];
        const dayOfWeek = day.getDay();
        const isWorkday = workdaySet.size === 0 || workdaySet.has(dayOfWeek);
        
        // Verificar se é férias
        if (vacationDays.has(dateStr)) {
          vacationCount++;
          if (!dailyRecords[dateStr]) {
            specialDays[dateStr] = { 
              date: dateStr, 
              check_in: null, 
              check_out: null, 
              hours: 0, 
              status: 'vacation',
              statusLabel: 'Férias'
            };
          }
          continue; // Não conta como falta
        }
        
        // Verificar se é feriado
        if (holidayDays.has(dateStr)) {
          holidayCount++;
          if (!dailyRecords[dateStr]) {
            specialDays[dateStr] = { 
              date: dateStr, 
              check_in: null, 
              check_out: null, 
              hours: 0, 
              status: 'holiday',
              statusLabel: holidayNames[dateStr] || 'Feriado'
            };
          }
          continue; // Não conta como falta
        }
        
        if (isWorkday && !dailyRecords[dateStr]) {
          absentDays++;
        }
      }
    }

    const presentDays = Object.keys(dailyRecords).length;
    const totalHours = Object.values(dailyRecords).reduce((sum, r) => sum + (r.hours || 0), 0);
    
    // Combinar registros de ponto com dias especiais (férias/feriados)
    const allRecords = { ...dailyRecords };
    Object.entries(specialDays).forEach(([date, data]) => {
      if (!allRecords[date]) {
        allRecords[date] = data;
      }
    });
    
    // Retornar todos os registros ordenados por data (mais recente primeiro)
    const attendanceRecords = Object.values(allRecords).sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      success: true,
      employee: {
        id: emp.id,
        name: emp.name,
        photo_url: emp.photo_url,
        position_name: emp.position_name || 'Não informado',
        department_name: emp.department_name || 'Não informado',
        matricula: emp.matricula
      },
      attendance: {
        month: monthStr,
        present: presentDays,
        absent: absentDays,
        vacation: vacationCount,
        holidays: holidayCount,
        totalHours: parseFloat(totalHours.toFixed(2)),
        records: attendanceRecords.map(r => ({
          date: r.date,
          check_in: r.check_in || '00:00:00',
          check_out: r.check_out || null,
          hours: r.hours || 0,
          status: r.status || 'present',
          statusLabel: r.statusLabel || null
        })),
        workdays: Array.from(workdaySet)
      }
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Erro ao consultar frequência.'
    });
  }
});

// GET - Dados completos do funcionário
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.*, p.name as position_name, d.name as department_name, s.name as sector_name,
        sc.name as schedule_name, sc.start_time, sc.end_time, sc.break_start, sc.break_end, sc.workdays
      FROM employees e
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN sectors s ON e.sector_id = s.id
      LEFT JOIN schedules sc ON e.schedule_id = sc.id
      WHERE e.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const statsResult = await pool.query(
      `SELECT COUNT(DISTINCT date) as total_days, COUNT(*) as total_punches
       FROM attendance_punches WHERE employee_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [req.params.id]
    );
    
    const hoursResult = await pool.query(
      `WITH daily_punches AS (
        SELECT 
          date,
          MAX(CASE WHEN punch_type = 'entry' THEN punch_time END) as entry,
          MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) as exit,
          MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) as break_start,
          MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) as break_end
        FROM attendance_punches
        WHERE employee_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date
      )
      SELECT 
        COUNT(*) as complete_days,
        AVG(EXTRACT(EPOCH FROM (exit - entry))/3600 - COALESCE(EXTRACT(EPOCH FROM (break_end - break_start))/3600, 0)) as avg_hours
      FROM daily_punches
      WHERE entry IS NOT NULL AND exit IS NOT NULL`,
      [req.params.id]
    );

    const employee = result.rows[0];
    const stats = statsResult.rows[0];
    const hours = hoursResult.rows[0];

    res.json({
      employee,
      stats: {
        total_days: parseInt(stats.total_days) || 0,
        complete_days: parseInt(hours.complete_days) || 0,
        incomplete_days: Math.max(0, (parseInt(stats.total_days) || 0) - (parseInt(hours.complete_days) || 0)),
        avg_hours: parseFloat(hours.avg_hours)?.toFixed(2) || '0.00'
      }
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do funcionário' });
  }
});

export default router;
