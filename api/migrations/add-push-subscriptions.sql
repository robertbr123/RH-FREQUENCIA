-- Tabela para configurações de notificação do funcionário
CREATE TABLE IF NOT EXISTS employee_notification_settings (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  reminder_minutes INTEGER DEFAULT 5, -- minutos antes para lembrar
  remind_entry BOOLEAN DEFAULT TRUE,
  remind_break_start BOOLEAN DEFAULT TRUE,
  remind_break_end BOOLEAN DEFAULT TRUE,
  remind_exit BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configurações padrão para funcionários existentes com credenciais do portal
INSERT INTO employee_notification_settings (employee_id)
SELECT employee_id FROM employee_portal_credentials
ON CONFLICT (employee_id) DO NOTHING;
