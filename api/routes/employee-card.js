import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Rate limiting simples (em memória)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 5;

const checkRateLimit = (ip) => {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];
  
  // Limpar requisições antigas
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return false; // Excedeu o limite
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true; // Permitido
};

// Endpoint PÚBLICO - Consulta de frequência por CPF
router.post('/check-attendance', async (req, res) => {
  const { cpf } = req.body;
  // Pegar IP da requisição (Vercel passa no header x-forwarded-for)
  const clientIp = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress || 'unknown';

  try {
    console.log('🔍 Tentativa de consulta de frequência');
    console.log('   IP:', clientIp);
    console.log('   CPF recebido:', cpf ? `${cpf.substring(0, 3)}***` : 'vazio');

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      console.log('❌ Rate limit excedido para IP:', clientIp);
      return res.status(429).json({ 
        success: false,
        message: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' 
      });
    }

    // Validar CPF
    if (!cpf || cpf.length !== 11 || !/^\d{11}$/.test(cpf)) {
      console.log('❌ CPF inválido:', cpf);
      return res.status(400).json({ 
        success: false,
        message: 'CPF inválido. Digite apenas os 11 dígitos.' 
      });
    }

    console.log('✅ Validações passaram, buscando funcionário...');

    // Buscar funcionário por CPF
    let employeeResult;
    try {
      // Buscar tanto com máscara quanto sem máscara
      // Remove pontos, hífens e espaços do CPF para comparação
      employeeResult = await pool.query(
        `SELECT 
          e.id,
          e.name,
          e.status,
          e.photo_url,
          p.name as position_name,
          d.name as department_name,
          LPAD(e.id::text, 6, '0') as matricula
        FROM employees e
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE REPLACE(REPLACE(REPLACE(e.cpf, '.', ''), '-', ''), ' ', '') = $1`,
        [cpf]
      );
      console.log('✅ Query de funcionário executada, resultados:', employeeResult.rows.length);
    } catch (dbError) {
      console.error('❌ Erro na query de funcionário:', dbError);
      throw dbError;
    }

    if (employeeResult.rows.length === 0) {
      // Log da tentativa (segurança)
      console.log(`❌ Tentativa de consulta com CPF não cadastrado: ${cpf.substring(0, 3)}***`);
      return res.status(404).json({ 
        success: false,
        message: 'CPF não encontrado. Verifique se está cadastrado no sistema.' 
      });
    }

    const employee = employeeResult.rows[0];
    console.log('✅ Funcionário encontrado:', employee.name);

    // Verificar se funcionário está ativo
    if (employee.status !== 'active') {
      console.log(`⚠️ Tentativa de consulta de funcionário inativo: ${employee.name}`);
      return res.status(403).json({ 
        success: false,
        message: 'Funcionário inativo. Contate o RH para mais informações.' 
      });
    }

    // Buscar frequência do mês atual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    console.log('📅 Buscando frequência em attendance_punches:', { employee_id: employee.id, startDate, endDate });

    let attendanceRecords = [];
    let presentDays = 0;
    let totalHours = 0;

    try {
      // Buscar todos os punches do mês
      const punchesResult = await pool.query(
        `SELECT 
          TO_CHAR(date, 'YYYY-MM-DD') as date,
          punch_type,
          TO_CHAR(punch_time, 'HH24:MI:SS') as punch_time
         FROM attendance_punches
         WHERE employee_id = $1
           AND date >= $2::date
           AND date <= $3::date
         ORDER BY date DESC, punch_time ASC`,
        [employee.id, startDate, endDate]
      );
      
      console.log(`� Total de punches encontrados: ${punchesResult.rows.length}`);
      
      // Agregar punches por dia
      const dailyRecords = {};
      
      punchesResult.rows.forEach(punch => {
        if (!dailyRecords[punch.date]) {
          dailyRecords[punch.date] = {
            date: punch.date,
            check_in: null,
            break_start: null,
            break_end: null,
            check_out: null,
            hours: 0
          };
        }
        
        if (punch.punch_type === 'entry') dailyRecords[punch.date].check_in = punch.punch_time;
        else if (punch.punch_type === 'break_start') dailyRecords[punch.date].break_start = punch.punch_time;
        else if (punch.punch_type === 'break_end') dailyRecords[punch.date].break_end = punch.punch_time;
        else if (punch.punch_type === 'exit') dailyRecords[punch.date].check_out = punch.punch_time;
      });
      
      // Calcular horas trabalhadas para cada dia
      Object.values(dailyRecords).forEach(record => {
        if (record.check_in && record.check_out) {
          const [entryH, entryM] = record.check_in.split(':').map(Number);
          const [exitH, exitM] = record.check_out.split(':').map(Number);
          
          let totalMinutes = (exitH * 60 + exitM) - (entryH * 60 + entryM);
          
          // Subtrair intervalo se houver
          if (record.break_start && record.break_end) {
            const [breakStartH, breakStartM] = record.break_start.split(':').map(Number);
            const [breakEndH, breakEndM] = record.break_end.split(':').map(Number);
            const breakMinutes = (breakEndH * 60 + breakEndM) - (breakStartH * 60 + breakStartM);
            totalMinutes -= breakMinutes;
          }
          
          record.hours = parseFloat((totalMinutes / 60).toFixed(2));
        }
      });
      
      attendanceRecords = Object.values(dailyRecords).slice(0, 10);
      presentDays = Object.keys(dailyRecords).length;
      totalHours = attendanceRecords.reduce((sum, r) => sum + (r.hours || 0), 0);
      
      console.log('✅ Registros processados:', attendanceRecords.length);
      if (attendanceRecords.length > 0) {
        console.log('� Primeiro registro:', JSON.stringify(attendanceRecords[0], null, 2));
      }
    } catch (dbError) {
      console.error('❌ Erro na query de frequência:', dbError);
      throw dbError;
    }

    // Calcular estatísticas
    const workDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const absentDays = Math.max(0, now.getDate() - presentDays);

    console.log('📊 Estatísticas:', { presentDays, absentDays, totalHours });

    // Log de sucesso (auditoria)
    console.log(`✅ Consulta de frequência: ${employee.name} (${cpf.substring(0, 3)}***)`);
    console.log('📤 Retornando dados:', {
      employee: employee.name,
      records: attendanceRecords.length,
      present: presentDays,
      absent: absentDays,
      totalHours: parseFloat(totalHours.toFixed(2))
    });

    res.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        photo_url: employee.photo_url,
        position_name: employee.position_name || 'Não informado',
        department_name: employee.department_name || 'Não informado',
        matricula: employee.matricula
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
        }))
      }
    });

  } catch (error) {
    console.error('❌ Erro ao consultar frequência:');
    console.error('   Mensagem:', error.message);
    console.error('   Stack:', error.stack);
    console.error('   Código:', error.code);
    
    res.status(500).json({ 
      success: false,
      message: 'Erro ao consultar frequência. Tente novamente mais tarde.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Buscar dados completos do funcionário para ficha
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        e.*,
        p.name as position_name,
        d.name as department_name,
        s.name as sector_name,
        sc.name as schedule_name,
        sc.start_time,
        sc.end_time,
        sc.break_start,
        sc.break_end,
        sc.workdays
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

    // Buscar estatísticas de frequência dos últimos 30 dias
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT date) as total_days,
        COUNT(*) as total_punches
      FROM attendance_punches 
      WHERE employee_id = $1 
      AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [req.params.id]
    );
    
    // Calcular média de horas trabalhadas
    const hoursResult = await pool.query(
      `WITH daily_punches AS (
        SELECT 
          date,
          MAX(CASE WHEN punch_type = 'entry' THEN punch_time END) as entry,
          MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) as exit,
          MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) as break_start,
          MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) as break_end
        FROM attendance_punches
        WHERE employee_id = $1
        AND date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY date
      )
      SELECT 
        COUNT(*) as complete_days,
        AVG(
          EXTRACT(EPOCH FROM (exit - entry))/3600 - 
          COALESCE(EXTRACT(EPOCH FROM (break_end - break_start))/3600, 0)
        ) as avg_hours
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
    console.error('Erro ao buscar ficha do funcionário:', error);
    res.status(500).json({ error: 'Erro ao buscar ficha do funcionário' });
  }
});

export default router;
