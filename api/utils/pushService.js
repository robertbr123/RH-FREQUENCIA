import webpush from 'web-push';
import pool from '../database.js';

// Configurar VAPID keys (você precisará gerar suas próprias chaves)
// Para gerar: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAf7-fK3IJXNvQh5z8pRb3U4GZLV7L0';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:suporte@rhf.com.br';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Exportar a chave pública para o frontend
export const getVapidPublicKey = () => VAPID_PUBLIC_KEY;

// Enviar notificação push para um funcionário
export async function sendPushNotification(employeeId, notification) {
  try {
    // Buscar todas as subscriptions ativas do funcionário
    const result = await pool.query(
      `SELECT endpoint, p256dh, auth 
       FROM push_subscriptions 
       WHERE employee_id = $1 AND is_active = TRUE`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      console.log(`Nenhuma subscription ativa para funcionário ${employeeId}`);
      return { sent: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title: notification.title || 'Lembrete de Ponto',
      body: notification.body || 'Está na hora de registrar seu ponto!',
      tag: notification.tag || `punch-${Date.now()}`,
      url: notification.url || '/portal/ponto',
      type: notification.type || 'reminder'
    });

    let sent = 0;
    let failed = 0;

    for (const sub of result.rows) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (error) {
        failed++;
        console.error(`Erro ao enviar push para ${sub.endpoint}:`, error.message);
        
        // Se a subscription expirou ou é inválida, desativar
        if (error.statusCode === 410 || error.statusCode === 404) {
          await pool.query(
            `UPDATE push_subscriptions SET is_active = FALSE WHERE endpoint = $1`,
            [sub.endpoint]
          );
        }
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error('Erro ao enviar push notifications:', error);
    return { sent: 0, failed: 0, error: error.message };
  }
}

// Enviar lembrete de ponto para funcionários
export async function sendPunchReminders() {
  const timezone = 'America/Rio_Branco';
  
  try {
    // Buscar horário atual no timezone correto
    const timeResult = await pool.query(
      `SELECT TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE $1, 'HH24:MI') as current_time,
              EXTRACT(DOW FROM CURRENT_TIMESTAMP AT TIME ZONE $1) as day_of_week`,
      [timezone]
    );
    
    const currentTime = timeResult.rows[0].current_time;
    const dayOfWeek = parseInt(timeResult.rows[0].day_of_week);
    
    // Não enviar lembretes em fim de semana (domingo=0, sábado=6)
    // Você pode ajustar isso conforme a necessidade
    
    console.log(`[Push Service] Verificando lembretes às ${currentTime} (dia ${dayOfWeek})`);

    // Buscar funcionários com notificações ativas e escalas definidas
    const employeesResult = await pool.query(
      `SELECT 
         e.id as employee_id,
         e.name,
         s.entry_time,
         s.break_start,
         s.break_end,
         s.exit_time,
         ns.reminder_minutes,
         ns.remind_entry,
         ns.remind_break_start,
         ns.remind_break_end,
         ns.remind_exit
       FROM employees e
       JOIN schedules s ON e.schedule_id = s.id
       JOIN employee_notification_settings ns ON ns.employee_id = e.id
       JOIN push_subscriptions ps ON ps.employee_id = e.id AND ps.is_active = TRUE
       WHERE ns.push_enabled = TRUE
         AND e.active = TRUE
       GROUP BY e.id, e.name, s.entry_time, s.break_start, s.break_end, s.exit_time,
                ns.reminder_minutes, ns.remind_entry, ns.remind_break_start, 
                ns.remind_break_end, ns.remind_exit`
    );

    const notifications = {
      entry: { title: 'Hora da Entrada! 🕐', body: 'Está quase na hora de registrar sua entrada.' },
      break_start: { title: 'Hora do Intervalo! ☕', body: 'Está quase na hora do seu intervalo.' },
      break_end: { title: 'Fim do Intervalo! ⏰', body: 'Seu intervalo está acabando.' },
      exit: { title: 'Hora da Saída! 🏠', body: 'Está quase na hora de registrar sua saída.' }
    };

    let totalSent = 0;

    for (const emp of employeesResult.rows) {
      const reminderMinutes = emp.reminder_minutes || 5;
      
      // Verificar cada tipo de ponto
      const checkPunch = async (punchTime, punchType, reminderEnabled) => {
        if (!punchTime || !reminderEnabled) return;
        
        // Calcular horário do lembrete (X minutos antes)
        const [hours, minutes] = punchTime.split(':').map(Number);
        let reminderHour = hours;
        let reminderMin = minutes - reminderMinutes;
        
        if (reminderMin < 0) {
          reminderMin += 60;
          reminderHour -= 1;
          if (reminderHour < 0) reminderHour = 23;
        }
        
        const reminderTime = `${String(reminderHour).padStart(2, '0')}:${String(reminderMin).padStart(2, '0')}`;
        
        // Se o horário atual bate com o lembrete
        if (currentTime === reminderTime) {
          // Verificar se já registrou este ponto hoje
          const punchCheck = await pool.query(
            `SELECT 1 FROM attendance_punches 
             WHERE employee_id = $1 
               AND date = (CURRENT_TIMESTAMP AT TIME ZONE $2)::date
               AND punch_type = $3`,
            [emp.employee_id, timezone, punchType]
          );
          
          if (punchCheck.rows.length === 0) {
            const notif = notifications[punchType];
            const result = await sendPushNotification(emp.employee_id, {
              title: notif.title,
              body: `${notif.body} Seu horário é às ${punchTime}.`,
              tag: `${punchType}-${emp.employee_id}-${Date.now()}`,
              type: punchType
            });
            totalSent += result.sent;
            console.log(`[Push] Lembrete de ${punchType} enviado para ${emp.name}`);
          }
        }
      };

      await checkPunch(emp.entry_time, 'entry', emp.remind_entry);
      await checkPunch(emp.break_start, 'break_start', emp.remind_break_start);
      await checkPunch(emp.break_end, 'break_end', emp.remind_break_end);
      await checkPunch(emp.exit_time, 'exit', emp.remind_exit);
    }

    return { checked: employeesResult.rows.length, sent: totalSent };
  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    return { error: error.message };
  }
}

export default {
  getVapidPublicKey,
  sendPushNotification,
  sendPunchReminders
};
