import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../database.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Middleware para autenticar token do portal
export const authenticatePortalToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'portal_secret', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    
    if (decoded.type !== 'employee_portal') {
      return res.status(403).json({ error: 'Token inválido para o portal' });
    }
    
    req.employee = decoded;
    next();
  });
};

// ==========================================
// HORÁRIO DO SERVIDOR
// ==========================================

// Obter horário do servidor (para sincronizar relógios)
router.get('/server-time', (req, res) => {
  // Rio Branco está em UTC-5 (sem horário de verão)
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // Converter para UTC
  const rioBrancoOffset = -5 * 60 * 60 * 1000; // UTC-5 em milissegundos
  const rioBrancoTime = new Date(utcTime + rioBrancoOffset);
  
  res.json({
    server_time: rioBrancoTime.toISOString(),
    timestamp: rioBrancoTime.getTime(),
    formatted: rioBrancoTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    timezone: 'America/Rio_Branco',
    utc_offset: -5
  });
});

// ==========================================
// AUTENTICAÇÃO
// ==========================================

// Login do portal do funcionário (CPF + senha)
router.post('/login', async (req, res) => {
  const { cpf, password } = req.body;

  try {
    // Limpar CPF (remover pontos e traços)
    const cleanCpf = cpf.replace(/\D/g, '');

    // Buscar funcionário pelo CPF (comparando sem formatação)
    const employeeResult = await pool.query(
      `SELECT e.id, e.name, e.cpf, e.email, e.photo_url, e.birth_date,
              e.department_id, d.name as department_name,
              e.position_id, p.name as position_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN positions p ON e.position_id = p.id
       WHERE REGEXP_REPLACE(e.cpf, '[^0-9]', '', 'g') = $1 AND e.status = 'active'`,
      [cleanCpf]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(401).json({ error: 'CPF não encontrado ou funcionário inativo' });
    }

    const employee = employeeResult.rows[0];

    // Buscar credenciais do portal
    const credResult = await pool.query(
      'SELECT * FROM employee_portal_credentials WHERE employee_id = $1',
      [employee.id]
    );

    let mustChangePassword = false;

    if (credResult.rows.length === 0) {
      // Primeiro acesso: senha padrão é a data de nascimento (ddmmyyyy)
      if (!employee.birth_date) {
        return res.status(400).json({ 
          error: 'Data de nascimento não cadastrada. Contate o RH.' 
        });
      }
      
      const birthDate = new Date(employee.birth_date);
      const defaultPassword = `${String(birthDate.getDate()).padStart(2, '0')}${String(birthDate.getMonth() + 1).padStart(2, '0')}${birthDate.getFullYear()}`;
      
      if (password !== defaultPassword) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      // Criar credenciais com senha padrão hasheada
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await pool.query(
        `INSERT INTO employee_portal_credentials (employee_id, password_hash, must_change_password)
         VALUES ($1, $2, true)`,
        [employee.id, hashedPassword]
      );
      
      mustChangePassword = true;
    } else {
      const credentials = credResult.rows[0];

      // Verificar se conta está bloqueada
      if (credentials.locked_until && new Date(credentials.locked_until) > new Date()) {
        const minutesLeft = Math.ceil((new Date(credentials.locked_until) - new Date()) / 60000);
        return res.status(423).json({ 
          error: `Conta bloqueada. Tente novamente em ${minutesLeft} minutos.` 
        });
      }

      // Verificar senha
      const validPassword = await bcrypt.compare(password, credentials.password_hash);
      
      if (!validPassword) {
        // Incrementar tentativas falhas
        const attempts = credentials.login_attempts + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        
        await pool.query(
          `UPDATE employee_portal_credentials 
           SET login_attempts = $1, locked_until = $2 
           WHERE employee_id = $3`,
          [attempts, lockUntil, employee.id]
        );

        if (attempts >= 5) {
          return res.status(423).json({ 
            error: 'Muitas tentativas falhas. Conta bloqueada por 15 minutos.' 
          });
        }

        return res.status(401).json({ 
          error: `Senha incorreta. ${5 - attempts} tentativas restantes.` 
        });
      }

      // Login bem sucedido - resetar tentativas
      await pool.query(
        `UPDATE employee_portal_credentials 
         SET login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
         WHERE employee_id = $1`,
        [employee.id]
      );

      mustChangePassword = credentials.must_change_password;
    }

    // Gerar token JWT (válido por 2 dias)
    const token = jwt.sign(
      { 
        id: employee.id, 
        name: employee.name, 
        cpf: employee.cpf,
        type: 'employee_portal'
      },
      process.env.JWT_SECRET || 'portal_secret',
      { expiresIn: '2d' }
    );

    res.json({
      token,
      mustChangePassword,
      employee: {
        id: employee.id,
        name: employee.name,
        cpf: employee.cpf,
        email: employee.email,
        photo_url: employee.photo_url,
        department: employee.department_name,
        position: employee.position_name
      }
    });
  } catch (error) {
    logger.error('Erro no login do portal:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

// Trocar senha
router.post('/change-password', authenticatePortalToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    // Buscar credenciais atuais
    const credResult = await pool.query(
      'SELECT * FROM employee_portal_credentials WHERE employee_id = $1',
      [req.employee.id]
    );

    if (credResult.rows.length === 0) {
      return res.status(404).json({ error: 'Credenciais não encontradas' });
    }

    const credentials = credResult.rows[0];

    // Se não é primeiro acesso, verificar senha atual
    if (!credentials.must_change_password) {
      const validPassword = await bcrypt.compare(currentPassword, credentials.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }
    }

    // Atualizar senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE employee_portal_credentials 
       SET password_hash = $1, must_change_password = false
       WHERE employee_id = $2`,
      [hashedPassword, req.employee.id]
    );

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    logger.error('Erro ao trocar senha:', error);
    res.status(500).json({ error: 'Erro ao trocar senha' });
  }
});

// ==========================================
// DADOS DO FUNCIONÁRIO
// ==========================================

// Obter dados do funcionário logado
router.get('/me', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.name, e.cpf, e.email, e.phone, e.photo_url,
              e.birth_date, e.hire_date, e.address, e.city, e.state,
              e.emergency_contact, e.emergency_phone,
              d.name as department_name, p.name as position_name,
              s.name as sector_name, u.name as unit_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN positions p ON e.position_id = p.id
       LEFT JOIN sectors s ON e.sector_id = s.id
       LEFT JOIN units u ON e.unit_id = u.id
       WHERE e.id = $1`,
      [req.employee.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao buscar dados:', error);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Atualizar dados pessoais (permitidos)
router.put('/me', authenticatePortalToken, async (req, res) => {
  const { phone, emergency_contact, emergency_phone, address, city, state } = req.body;

  try {
    const result = await pool.query(
      `UPDATE employees 
       SET phone = COALESCE($1, phone),
           emergency_contact = COALESCE($2, emergency_contact),
           emergency_phone = COALESCE($3, emergency_phone),
           address = COALESCE($4, address),
           city = COALESCE($5, city),
           state = COALESCE($6, state),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, name, phone, emergency_contact, emergency_phone, address, city, state`,
      [phone, emergency_contact, emergency_phone, address, city, state, req.employee.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    res.json({ 
      message: 'Dados atualizados com sucesso',
      employee: result.rows[0]
    });
  } catch (error) {
    logger.error('Erro ao atualizar dados:', error);
    res.status(500).json({ error: 'Erro ao atualizar dados' });
  }
});

// Upload de foto do funcionário (base64)
router.post('/me/photo', authenticatePortalToken, async (req, res) => {
  const { photo } = req.body;

  try {
    if (!photo) {
      return res.status(400).json({ error: 'Foto é obrigatória' });
    }

    // Validar se é base64 válida
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!base64Regex.test(photo)) {
      return res.status(400).json({ error: 'Formato de imagem inválido. Use JPEG, PNG ou WebP.' });
    }

    // Verificar tamanho (máximo 5MB em base64)
    const sizeInBytes = (photo.length * 3) / 4;
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (sizeInBytes > maxSize) {
      return res.status(400).json({ error: 'Imagem muito grande. Máximo 5MB.' });
    }

    // Atualizar foto
    await pool.query(
      'UPDATE employees SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [photo, req.employee.id]
    );

    res.json({ 
      message: 'Foto atualizada com sucesso',
      photo_url: photo
    });
  } catch (error) {
    logger.error('Erro ao atualizar foto:', error);
    res.status(500).json({ error: 'Erro ao atualizar foto' });
  }
});

// Remover foto
router.delete('/me/photo', authenticatePortalToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE employees SET photo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [req.employee.id]
    );

    res.json({ message: 'Foto removida com sucesso' });
  } catch (error) {
    logger.error('Erro ao remover foto:', error);
    res.status(500).json({ error: 'Erro ao remover foto' });
  }
});

// ==========================================
// REGISTROS DE PONTO
// ==========================================

// Obter registros de ponto do mês atual
router.get('/attendance', authenticatePortalToken, async (req, res) => {
  const { month, year } = req.query;
  
  try {
    const targetMonth = month || new Date().getMonth() + 1;
    const targetYear = year || new Date().getFullYear();

    const result = await pool.query(
      `SELECT 
         date,
         MAX(CASE WHEN punch_type = 'entry' THEN TO_CHAR(punch_time, 'HH24:MI') END) as entry_time,
         MAX(CASE WHEN punch_type = 'break_start' THEN TO_CHAR(punch_time, 'HH24:MI') END) as break_start,
         MAX(CASE WHEN punch_type = 'break_end' THEN TO_CHAR(punch_time, 'HH24:MI') END) as break_end,
         MAX(CASE WHEN punch_type = 'exit' THEN TO_CHAR(punch_time, 'HH24:MI') END) as exit_time
       FROM attendance_punches
       WHERE employee_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       GROUP BY date
       ORDER BY date DESC`,
      [req.employee.id, targetMonth, targetYear]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar frequência:', error);
    res.status(500).json({ error: 'Erro ao buscar frequência' });
  }
});

// Obter resumo do ponto de hoje
router.get('/attendance/today', authenticatePortalToken, async (req, res) => {
  try {
    // Horário já está gravado em Rio Branco, ler diretamente
    const result = await pool.query(
      `SELECT 
         punch_type,
         TO_CHAR(punch_time, 'HH24:MI') as time
       FROM attendance_punches
       WHERE employee_id = $1 
         AND date = (NOW() AT TIME ZONE 'America/Rio_Branco')::date
       ORDER BY punch_time`,
      [req.employee.id]
    );

    const punches = {
      entry: null,
      break_start: null,
      break_end: null,
      exit: null
    };

    result.rows.forEach(row => {
      punches[row.punch_type] = row.time;
    });

    // Calcular próximo ponto esperado
    let nextPunch = 'entry';
    if (punches.entry && !punches.break_start) nextPunch = 'break_start';
    else if (punches.break_start && !punches.break_end) nextPunch = 'break_end';
    else if (punches.break_end && !punches.exit) nextPunch = 'exit';
    else if (punches.exit) nextPunch = 'completed';

    // Incluir horário do servidor para sincronização
    const now = new Date();
    const brasilTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Rio_Branco' }));

    res.json({
      date: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Rio_Branco' }),
      punches,
      nextPunch,
      server_time: brasilTime.getTime()
    });
  } catch (error) {
    logger.error('Erro ao buscar ponto de hoje:', error);
    res.status(500).json({ error: 'Erro ao buscar ponto de hoje' });
  }
});

// ==========================================
// BANCO DE HORAS
// ==========================================

// Obter saldo de banco de horas (mês atual)
router.get('/hour-bank', authenticatePortalToken, async (req, res) => {
  try {
    // Buscar escala do funcionário para calcular horas esperadas por dia
    const scheduleResult = await pool.query(
      `SELECT s.start_time, s.end_time, s.break_start, s.break_end
       FROM employees e
       LEFT JOIN schedules s ON e.schedule_id = s.id
       WHERE e.id = $1`,
      [req.employee.id]
    );

    // Calcular horas esperadas por dia baseado na escala
    let workHoursPerDay = 8; // padrão
    const schedule = scheduleResult.rows[0];
    
    if (schedule?.start_time && schedule?.end_time) {
      const start = schedule.start_time.split(':').map(Number);
      const end = schedule.end_time.split(':').map(Number);
      const startMinutes = start[0] * 60 + start[1];
      const endMinutes = end[0] * 60 + end[1];
      
      let totalMinutes = endMinutes - startMinutes;
      
      // Descontar intervalo se houver
      if (schedule.break_start && schedule.break_end) {
        const breakStart = schedule.break_start.split(':').map(Number);
        const breakEnd = schedule.break_end.split(':').map(Number);
        const breakMinutes = (breakEnd[0] * 60 + breakEnd[1]) - (breakStart[0] * 60 + breakStart[1]);
        totalMinutes -= breakMinutes;
      }
      
      workHoursPerDay = totalMinutes / 60;
    }

    // Calcular horas trabalhadas vs esperadas (apenas mês atual)
    const result = await pool.query(
      `WITH daily_hours AS (
         SELECT 
           date,
           EXTRACT(EPOCH FROM (
             MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) -
             MAX(CASE WHEN punch_type = 'entry' THEN punch_time END) -
             COALESCE(
               MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) -
               MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END),
               INTERVAL '0'
             )
           )) / 3600 as hours_worked
         FROM attendance_punches
         WHERE employee_id = $1
           AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM CURRENT_DATE)
           AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM CURRENT_DATE)
           AND punch_type IN ('entry', 'exit', 'break_start', 'break_end')
         GROUP BY date
         HAVING MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) IS NOT NULL
       )
       SELECT 
         COUNT(*) as days_worked,
         COALESCE(SUM(hours_worked), 0) as total_worked
       FROM daily_hours`,
      [req.employee.id]
    );

    const stats = result.rows[0];
    const daysWorked = parseInt(stats.days_worked) || 0;
    const totalWorked = parseFloat(stats.total_worked) || 0;
    const totalExpected = daysWorked * workHoursPerDay;
    const balance = totalWorked - totalExpected;

    res.json({
      days_worked: daysWorked,
      total_worked: totalWorked,
      total_expected: totalExpected,
      balance: balance,
      work_hours_per_day: workHoursPerDay
    });
  } catch (error) {
    logger.error('Erro ao buscar banco de horas:', error);
    res.status(500).json({ error: 'Erro ao buscar banco de horas' });
  }
});

// ==========================================
// FÉRIAS
// ==========================================

// Obter férias do funcionário
router.get('/vacations', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, year, month, start_date, end_date, days, notes, created_at
       FROM employee_vacations
       WHERE employee_id = $1
       ORDER BY start_date DESC`,
      [req.employee.id]
    );

    // Buscar dados do funcionário para calcular saldo
    const employeeResult = await pool.query(
      'SELECT hire_date FROM employees WHERE id = $1',
      [req.employee.id]
    );

    let balance = {
      acquired_days: 0,
      used_days: 0,
      pending_days: 0,
      available_days: 0,
      hire_date: null,
      next_acquisition_date: null
    };

    if (employeeResult.rows.length > 0 && employeeResult.rows[0].hire_date) {
      const hireDate = new Date(employeeResult.rows[0].hire_date);
      balance.hire_date = hireDate.toISOString().split('T')[0];
      
      // Calcular meses trabalhados
      const now = new Date();
      const monthsWorked = Math.floor((now.getTime() - hireDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
      
      // 30 dias por ano = 2.5 dias por mês
      balance.acquired_days = Math.min(30, Math.floor(monthsWorked * 2.5));
      
      // Próxima data de aquisição (1 ano após admissão)
      const nextAcquisition = new Date(hireDate);
      const yearsWorked = Math.floor(monthsWorked / 12);
      nextAcquisition.setFullYear(hireDate.getFullYear() + yearsWorked + 1);
      balance.next_acquisition_date = nextAcquisition.toISOString().split('T')[0];
      
      // Subtrair dias já tirados
      const takenResult = await pool.query(
        `SELECT COALESCE(SUM(days), 0) as taken
         FROM employee_vacations
         WHERE employee_id = $1`,
        [req.employee.id]
      );
      
      balance.used_days = parseInt(takenResult.rows[0].taken) || 0;
      balance.available_days = Math.max(0, balance.acquired_days - balance.used_days);
    }

    res.json({
      vacations: result.rows.map(v => ({
        ...v,
        status: 'completed' // Para férias já registradas
      })),
      balance
    });
  } catch (error) {
    logger.error('Erro ao buscar férias:', error);
    res.status(500).json({ error: 'Erro ao buscar férias' });
  }
});

// ==========================================
// NOTIFICAÇÕES
// ==========================================

// Listar notificações
router.get('/notifications', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, message, type, is_read, link, created_at
       FROM employee_notifications
       WHERE employee_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.employee.id]
    );

    const unreadCount = result.rows.filter(n => !n.is_read).length;

    res.json({
      notifications: result.rows,
      unread_count: unreadCount
    });
  } catch (error) {
    logger.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
});

// Marcar notificação como lida
router.put('/notifications/:id/read', authenticatePortalToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE employee_notifications 
       SET is_read = true 
       WHERE id = $1 AND employee_id = $2`,
      [req.params.id, req.employee.id]
    );

    res.json({ message: 'Notificação marcada como lida' });
  } catch (error) {
    logger.error('Erro ao marcar notificação:', error);
    res.status(500).json({ error: 'Erro ao marcar notificação' });
  }
});

// Marcar todas como lidas
router.put('/notifications/read-all', authenticatePortalToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE employee_notifications 
       SET is_read = true 
       WHERE employee_id = $1 AND is_read = false`,
      [req.employee.id]
    );

    res.json({ message: 'Todas notificações marcadas como lidas' });
  } catch (error) {
    logger.error('Erro ao marcar notificações:', error);
    res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
});

// Excluir notificação (funcionário pode excluir suas próprias)
router.delete('/notifications/:id', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM employee_notifications 
       WHERE id = $1 AND employee_id = $2
       RETURNING id`,
      [req.params.id, req.employee.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json({ message: 'Notificação excluída com sucesso' });
  } catch (error) {
    logger.error('Erro ao excluir notificação:', error);
    res.status(500).json({ error: 'Erro ao excluir notificação' });
  }
});

// Excluir todas as notificações lidas
router.delete('/notifications/clear/read', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM employee_notifications 
       WHERE employee_id = $1 AND is_read = true
       RETURNING id`,
      [req.employee.id]
    );

    res.json({ 
      message: 'Notificações lidas excluídas',
      deleted_count: result.rows.length
    });
  } catch (error) {
    logger.error('Erro ao limpar notificações:', error);
    res.status(500).json({ error: 'Erro ao limpar notificações' });
  }
});

// ==========================================
// SOLICITAÇÕES
// ==========================================

// Listar solicitações do funcionário
router.get('/requests', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as reviewer_name
       FROM employee_requests r
       LEFT JOIN users u ON r.reviewed_by = u.id
       WHERE r.employee_id = $1
       ORDER BY r.created_at DESC`,
      [req.employee.id]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('Erro ao buscar solicitações:', error);
    res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
});

// Criar nova solicitação
router.post('/requests', authenticatePortalToken, async (req, res) => {
  const { request_type, data, justification } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO employee_requests (employee_id, request_type, data, justification)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.employee.id, request_type, JSON.stringify(data), justification]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao criar solicitação:', error);
    res.status(500).json({ error: 'Erro ao criar solicitação' });
  }
});

// Cancelar solicitação pendente
router.put('/requests/:id/cancel', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE employee_requests 
       SET status = 'cancelled'
       WHERE id = $1 AND employee_id = $2 AND status = 'pending'
       RETURNING *`,
      [req.params.id, req.employee.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitação não encontrada ou não pode ser cancelada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao cancelar solicitação:', error);
    res.status(500).json({ error: 'Erro ao cancelar solicitação' });
  }
});

// ==========================================
// REGISTRO DE PONTO FACIAL
// ==========================================

// Registrar ponto via reconhecimento facial (do portal)
router.post('/punch/facial', authenticatePortalToken, async (req, res) => {
  const { face_descriptor, latitude, longitude } = req.body;

  try {
    // Buscar o descritor facial cadastrado do funcionário
    const employeeResult = await pool.query(
      `SELECT id, name, face_descriptor, photo_url, department_id
       FROM employees 
       WHERE id = $1 AND status = 'active'`,
      [req.employee.id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const employee = employeeResult.rows[0];

    if (!employee.face_descriptor) {
      return res.status(400).json({ 
        error: 'Rosto não cadastrado. Solicite ao RH para cadastrar seu rosto.' 
      });
    }

    // Comparar face_descriptor enviado com o cadastrado
    // Garantir que storedDescriptor seja um array (pode vir como string JSON do banco)
    let storedDescriptor = employee.face_descriptor;
    if (typeof storedDescriptor === 'string') {
      try {
        storedDescriptor = JSON.parse(storedDescriptor);
      } catch (e) {
        logger.error('Erro ao parsear descritor cadastrado', e);
      }
    }
    
    // Garantir que sentDescriptor seja um array
    let sentDescriptor = face_descriptor;
    if (typeof sentDescriptor === 'string') {
      try {
        sentDescriptor = JSON.parse(sentDescriptor);
      } catch (e) {
        logger.error('Erro ao parsear descritor enviado', e);
      }
    }

    logger.debug('Verificação facial', { 
      storedType: typeof storedDescriptor, 
      storedLength: storedDescriptor?.length,
      sentType: typeof sentDescriptor, 
      sentLength: sentDescriptor?.length 
    });

    // Verificar se os descritores são válidos
    if (!storedDescriptor || !Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) {
      logger.error('Descritor cadastrado inválido', { employeeId: employee.id, length: storedDescriptor?.length });
      return res.status(400).json({ 
        error: 'Dados faciais cadastrados estão corrompidos. Solicite ao RH para recadastrar seu rosto.',
        type: 'invalid_stored_descriptor'
      });
    }

    if (!sentDescriptor || !Array.isArray(sentDescriptor) || sentDescriptor.length !== 128) {
      logger.error('Descritor enviado inválido', { length: sentDescriptor?.length });
      return res.status(400).json({ 
        error: 'Erro na captura do rosto. Tente novamente.',
        type: 'invalid_sent_descriptor'
      });
    }

    // Calcular distância euclidiana
    let distance = 0;
    for (let i = 0; i < 128; i++) {
      const stored = parseFloat(storedDescriptor[i]) || 0;
      const sent = parseFloat(sentDescriptor[i]) || 0;
      distance += Math.pow(stored - sent, 2);
    }
    distance = Math.sqrt(distance);

    logger.debug('Comparação facial', { name: employee.name, id: employee.id, distance: distance.toFixed(4) });

    // Threshold de 0.5 para validar (mais rigoroso - quanto menor, mais parecido)
    // Valores típicos: mesma pessoa < 0.4, pessoas diferentes > 0.6
    const THRESHOLD = 0.5;
    
    if (distance > THRESHOLD) {
      logger.debug('Verificação facial rejeitada', { distance: distance.toFixed(4), threshold: THRESHOLD });
      return res.status(401).json({ 
        error: 'Rosto não reconhecido. Apenas você pode registrar seu próprio ponto. Se seus dados faciais estiverem desatualizados, solicite ao RH para atualizar.',
        type: 'face_mismatch',
        distance: distance.toFixed(4)
      });
    }

    logger.debug('Verificação facial aprovada', { distance: distance.toFixed(4), threshold: THRESHOLD });

    // Verificar último ponto registrado hoje
    const todayResult = await pool.query(
      `SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Rio_Branco')::date as today`
    );
    const today = todayResult.rows[0].today;
    
    const lastPunchResult = await pool.query(
      `SELECT punch_type FROM attendance_punches 
       WHERE employee_id = $1 AND date = $2 
       ORDER BY punch_time DESC LIMIT 1`,
      [employee.id, today]
    );

    // Determinar tipo do próximo ponto
    let punchType = 'entry';
    if (lastPunchResult.rows.length > 0) {
      const lastPunch = lastPunchResult.rows[0].punch_type;
      if (lastPunch === 'entry') punchType = 'break_start';
      else if (lastPunch === 'break_start') punchType = 'break_end';
      else if (lastPunch === 'break_end') punchType = 'exit';
      else if (lastPunch === 'exit') {
        return res.status(400).json({ 
          success: false,
          type: 'completed',
          message: 'Todos os pontos de hoje já foram registrados' 
        });
      }
    }

    // Registrar o ponto - gravar horário de Rio Branco diretamente
    const punchResult = await pool.query(
      `INSERT INTO attendance_punches (employee_id, date, punch_type, punch_time, latitude, longitude)
       VALUES ($1, $2, $3, (NOW() AT TIME ZONE 'America/Rio_Branco'), $4, $5)
       RETURNING *, TO_CHAR(punch_time, 'HH24:MI') as formatted_time`,
      [employee.id, today, punchType, latitude || null, longitude || null]
    );

    // Buscar resumo do dia (horário já está em Rio Branco)
    const summaryResult = await pool.query(
      `SELECT 
         MAX(CASE WHEN punch_type = 'entry' THEN TO_CHAR(punch_time, 'HH24:MI') END) as entry,
         MAX(CASE WHEN punch_type = 'break_start' THEN TO_CHAR(punch_time, 'HH24:MI') END) as break_start,
         MAX(CASE WHEN punch_type = 'break_end' THEN TO_CHAR(punch_time, 'HH24:MI') END) as break_end,
         MAX(CASE WHEN punch_type = 'exit' THEN TO_CHAR(punch_time, 'HH24:MI') END) as exit
       FROM attendance_punches
       WHERE employee_id = $1 AND date = $2`,
      [employee.id, today]
    );

    // Determinar próximo ponto
    let nextPunch = null;
    if (punchType === 'entry') nextPunch = 'break_start';
    else if (punchType === 'break_start') nextPunch = 'break_end';
    else if (punchType === 'break_end') nextPunch = 'exit';

    const punchLabels = {
      entry: 'Entrada',
      break_start: 'Início do Intervalo',
      break_end: 'Fim do Intervalo',
      exit: 'Saída'
    };

    res.json({
      success: true,
      type: 'punch',
      message: `${punchLabels[punchType]} registrada com sucesso!`,
      punch_type: punchType,
      punch_time: punchResult.rows[0].formatted_time,
      next_punch: nextPunch,
      employee: {
        id: employee.id,
        name: employee.name,
        photo_url: employee.photo_url
      },
      today_summary: summaryResult.rows[0],
      face_match: {
        verified: true,
        confidence: ((1 - distance) * 100).toFixed(1) + '%'
      }
    });

  } catch (error) {
    logger.error('Erro ao registrar ponto facial:', error);
    res.status(500).json({ error: 'Erro ao registrar ponto' });
  }
});

// Verificar se funcionário tem face cadastrada
router.get('/face-status', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT face_descriptor IS NOT NULL as has_face FROM employees WHERE id = $1',
      [req.employee.id]
    );

    res.json({
      has_face: result.rows[0]?.has_face || false
    });
  } catch (error) {
    logger.error('Erro ao verificar face:', error);
    res.status(500).json({ error: 'Erro ao verificar face' });
  }
});

// ==========================================
// CONFIGURAÇÕES DE NOTIFICAÇÃO
// ==========================================

// Obter configurações de notificação
router.get('/push/settings', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM employee_notification_settings WHERE employee_id = $1`,
      [req.employee.id]
    );

    if (result.rows.length === 0) {
      // Retornar configurações padrão
      return res.json({
        push_enabled: false,
        reminder_minutes: 5,
        remind_entry: true,
        remind_break_start: true,
        remind_break_end: true,
        remind_exit: true
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Atualizar configurações de notificação
router.put('/push/settings', authenticatePortalToken, async (req, res) => {
  const { 
    push_enabled, 
    reminder_minutes, 
    remind_entry, 
    remind_break_start, 
    remind_break_end, 
    remind_exit 
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO employee_notification_settings 
       (employee_id, push_enabled, reminder_minutes, remind_entry, remind_break_start, remind_break_end, remind_exit, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       ON CONFLICT (employee_id) 
       DO UPDATE SET 
         push_enabled = $2, 
         reminder_minutes = $3, 
         remind_entry = $4, 
         remind_break_start = $5, 
         remind_break_end = $6, 
         remind_exit = $7,
         updated_at = CURRENT_TIMESTAMP`,
      [
        req.employee.id,
        push_enabled ?? false,
        reminder_minutes ?? 5,
        remind_entry ?? true,
        remind_break_start ?? true,
        remind_break_end ?? true,
        remind_exit ?? true
      ]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

// Obter escala/horários do funcionário
router.get('/schedule', authenticatePortalToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.* 
       FROM schedules s
       JOIN employees e ON e.schedule_id = s.id
       WHERE e.id = $1`,
      [req.employee.id]
    );

    if (result.rows.length === 0) {
      return res.json({ schedule: null });
    }

    res.json({ schedule: result.rows[0] });
  } catch (error) {
    logger.error('Erro ao buscar escala:', error);
    res.status(500).json({ error: 'Erro ao buscar escala' });
  }
});

// ==========================================
// ADMIN - REDEFINIR SENHA DO FUNCIONÁRIO
// ==========================================

// Middleware para verificar se é admin/gestor (via token normal do sistema)
const authenticateAdminToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' });
    }
    
    // Verificar se é admin ou gestor
    if (!['admin', 'gestor'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Acesso não autorizado' });
    }
    
    req.user = decoded;
    next();
  });
};

// Redefinir senha do funcionário (apenas admin/gestor)
router.post('/admin/reset-password', authenticateAdminToken, async (req, res) => {
  const { employee_id, new_password } = req.body;

  try {
    if (!employee_id || !new_password) {
      return res.status(400).json({ error: 'ID do funcionário e nova senha são obrigatórios' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se o funcionário existe
    const employeeResult = await pool.query(
      'SELECT id, name FROM employees WHERE id = $1',
      [employee_id]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }

    const employee = employeeResult.rows[0];

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Atualizar ou criar credencial do portal
    const existingCredential = await pool.query(
      'SELECT id FROM employee_portal_credentials WHERE employee_id = $1',
      [employee_id]
    );

    if (existingCredential.rows.length > 0) {
      // Atualizar senha existente e marcar para trocar
      await pool.query(
        `UPDATE employee_portal_credentials 
         SET password_hash = $1, must_change_password = true, updated_at = NOW()
         WHERE employee_id = $2`,
        [hashedPassword, employee_id]
      );
    } else {
      // Criar nova credencial
      await pool.query(
        `INSERT INTO employee_portal_credentials (employee_id, password_hash, must_change_password)
         VALUES ($1, $2, true)`,
        [employee_id, hashedPassword]
      );
    }

    logger.info('Senha redefinida pelo admin', { employeeId: employee_id, employeeName: employee.name, adminName: req.user.name || req.user.username });

    res.json({ 
      success: true, 
      message: `Senha de ${employee.name} redefinida com sucesso` 
    });

  } catch (error) {
    logger.error('Erro ao redefinir senha', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

// ==========================================
// SINCRONIZAÇÃO OFFLINE
// ==========================================

// Sincronizar pontos registrados offline
router.post('/sync/punches', authenticatePortalToken, async (req, res) => {
  const { punches } = req.body;

  try {
    if (!punches || !Array.isArray(punches) || punches.length === 0) {
      return res.status(400).json({ error: 'Nenhum ponto para sincronizar' });
    }

    logger.debug('Sincronização offline', { punchCount: punches.length, employeeId: req.employee.id });

    const results = [];
    const errors = [];

    for (const punch of punches) {
      try {
        const { face_descriptor, latitude, longitude, timestamp, id: punchId } = punch;

        // Validar timestamp (não aceitar pontos muito antigos - máximo 7 dias)
        const punchDate = new Date(timestamp);
        const now = new Date();
        const diffDays = (now - punchDate) / (1000 * 60 * 60 * 24);
        
        if (diffDays > 7) {
          errors.push({
            id: punchId,
            error: 'Ponto muito antigo (máximo 7 dias)'
          });
          continue;
        }

        // Buscar o descritor facial cadastrado do funcionário
        const employeeResult = await pool.query(
          `SELECT id, name, face_descriptor FROM employees WHERE id = $1 AND status = 'active'`,
          [req.employee.id]
        );

        if (employeeResult.rows.length === 0) {
          errors.push({
            id: punchId,
            error: 'Funcionário não encontrado'
          });
          continue;
        }

        const employee = employeeResult.rows[0];

        // Validar face
        let storedDescriptor = employee.face_descriptor;
        if (typeof storedDescriptor === 'string') {
          storedDescriptor = JSON.parse(storedDescriptor);
        }

        let sentDescriptor = face_descriptor;
        if (typeof sentDescriptor === 'string') {
          sentDescriptor = JSON.parse(sentDescriptor);
        }

        if (!storedDescriptor || !Array.isArray(storedDescriptor) || storedDescriptor.length !== 128) {
          errors.push({
            id: punchId,
            error: 'Dados faciais cadastrados inválidos'
          });
          continue;
        }

        if (!sentDescriptor || !Array.isArray(sentDescriptor) || sentDescriptor.length !== 128) {
          errors.push({
            id: punchId,
            error: 'Dados faciais enviados inválidos'
          });
          continue;
        }

        // Calcular distância euclidiana
        let distance = 0;
        for (let i = 0; i < 128; i++) {
          const stored = parseFloat(storedDescriptor[i]) || 0;
          const sent = parseFloat(sentDescriptor[i]) || 0;
          distance += Math.pow(stored - sent, 2);
        }
        distance = Math.sqrt(distance);

        const THRESHOLD = 0.5;
        if (distance > THRESHOLD) {
          errors.push({
            id: punchId,
            error: 'Rosto não reconhecido'
          });
          continue;
        }

        // Calcular a data do ponto baseada no timestamp
        const punchDateStr = punchDate.toISOString().split('T')[0];

        // Verificar último ponto registrado naquele dia
        const lastPunchResult = await pool.query(
          `SELECT punch_type FROM attendance_punches 
           WHERE employee_id = $1 AND date = $2 
           ORDER BY punch_time DESC LIMIT 1`,
          [employee.id, punchDateStr]
        );

        // Determinar tipo do próximo ponto
        let punchType = 'entry';
        if (lastPunchResult.rows.length > 0) {
          const lastPunch = lastPunchResult.rows[0].punch_type;
          if (lastPunch === 'entry') punchType = 'break_start';
          else if (lastPunch === 'break_start') punchType = 'break_end';
          else if (lastPunch === 'break_end') punchType = 'exit';
          else if (lastPunch === 'exit') {
            errors.push({
              id: punchId,
              error: 'Todos os pontos do dia já registrados'
            });
            continue;
          }
        }

        // Registrar o ponto com o timestamp original
        await pool.query(
          `INSERT INTO attendance_punches (employee_id, date, punch_type, punch_time, latitude, longitude)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [employee.id, punchDateStr, punchType, punchDate, latitude || null, longitude || null]
        );

        results.push({
          id: punchId,
          success: true,
          punch_type: punchType,
          date: punchDateStr
        });

        logger.debug('Ponto offline sincronizado', { type: punchType, name: employee.name, date: punchDateStr });

      } catch (punchError) {
        logger.error('Erro ao processar ponto offline', punchError);
        errors.push({
          id: punch.id,
          error: 'Erro ao processar ponto'
        });
      }
    }

    res.json({
      success: true,
      synced: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    logger.error('[SYNC] Erro na sincronização:', error);
    res.status(500).json({ error: 'Erro ao sincronizar pontos' });
  }
});

export default router;
