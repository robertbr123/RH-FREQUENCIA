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

// Endpoint PÚBLICO - Consulta de frequência por CPF
router.post('/check-attendance', async (req, res) => {
  const { cpf } = req.body;
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

    // Datas
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

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

    // Calcular faltas (apenas dias de trabalho)
    let absentDays = 0;
    for (let d = 1; d <= now.getDate(); d++) {
      const day = new Date(now.getFullYear(), now.getMonth(), d);
      const dateStr = day.toISOString().split('T')[0];
      const dayOfWeek = day.getDay();
      const isWorkday = workdaySet.size === 0 || workdaySet.has(dayOfWeek);
      
      if (isWorkday && !dailyRecords[dateStr]) {
        absentDays++;
      }
    }

    const presentDays = Object.keys(dailyRecords).length;
    const totalHours = Object.values(dailyRecords).reduce((sum, r) => sum + (r.hours || 0), 0);
    const attendanceRecords = Object.values(dailyRecords).slice(0, 10);

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
        totalHours: parseFloat(totalHours.toFixed(2)),
        records: attendanceRecords.map(r => ({
          date: r.date,
          check_in: r.check_in || '00:00:00',
          check_out: r.check_out || null,
          hours: r.hours || 0
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
