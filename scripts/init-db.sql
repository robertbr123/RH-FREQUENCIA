-- Script de inicialização automática do banco de dados
-- Este script será executado automaticamente quando o container PostgreSQL iniciar

-- Configurar timezone
SET timezone = 'America/Rio_Branco';

-- Criar extensão para geração de UUIDs (se necessário no futuro)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários (administradores, gestores, operadores)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  role VARCHAR(50) DEFAULT 'operador' CHECK (role IN ('admin', 'gestor', 'operador')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de cargos
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de departamentos
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de setores
CREATE TABLE IF NOT EXISTS sectors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de unidades
CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de horários
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  workdays JSONB DEFAULT '["1","2","3","4","5"]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  system_name VARCHAR(255) DEFAULT 'RH System',
  primary_color VARCHAR(7) DEFAULT '#3b82f6',
  logo_url TEXT,
  icon_url TEXT,
  company_name VARCHAR(255),
  company_address TEXT,
  company_phone VARCHAR(20),
  company_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de funcionários
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  rg VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(20),
  marital_status VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  phone VARCHAR(20),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  sector_id INTEGER REFERENCES sectors(id) ON DELETE SET NULL,
  schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  photo_url TEXT,
  status VARCHAR(20) DEFAULT 'active',
  hire_date DATE NOT NULL,
  salary DECIMAL(10,2),
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  pis VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de registros de frequência (sistema antigo - compatibilidade)
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  check_in TIMESTAMP NOT NULL,
  check_out TIMESTAMP,
  status VARCHAR(20) DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de pontos (sistema novo - múltiplos pontos)
CREATE TABLE IF NOT EXISTS attendance_punches (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  punch_time TIMESTAMP NOT NULL,
  punch_type VARCHAR(20) NOT NULL CHECK (punch_type IN ('entry', 'break_start', 'break_end', 'exit')),
  schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_punch_per_type UNIQUE (employee_id, date, punch_type)
);

-- Tabela de férias dos funcionários
CREATE TABLE IF NOT EXISTS employee_vacations (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_dates CHECK (end_date >= start_date),
  CONSTRAINT unique_employee_vacation UNIQUE(employee_id, year, month)
);

-- Tabela de feriados
CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) DEFAULT 'national' CHECK (type IN ('national', 'state', 'municipal', 'company')),
  recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_attendance_punches_employee ON attendance_punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_punches_date ON attendance_punches(date);
CREATE INDEX IF NOT EXISTS idx_attendance_punches_employee_date ON attendance_punches(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employee_vacations_employee ON employee_vacations(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_vacations_dates ON employee_vacations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacations_year_month ON employee_vacations(year, month);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- Criar view para consolidação diária de pontos
CREATE OR REPLACE VIEW attendance_daily AS
SELECT 
  employee_id,
  date,
  MAX(CASE WHEN punch_type = 'entry' THEN punch_time END) as entry_time,
  MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) as break_start_time,
  MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) as break_end_time,
  MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) as exit_time,
  -- Calcular horas trabalhadas
  CASE 
    WHEN MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) IS NOT NULL 
         AND MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) IS NOT NULL
         AND MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) IS NOT NULL THEN
      -- Com intervalo: (break_start - entry) + (exit - break_end)
      EXTRACT(EPOCH FROM (
        (MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) - MAX(CASE WHEN punch_type = 'entry' THEN punch_time END)) +
        (MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) - MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END))
      )) / 3600
    WHEN MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) IS NOT NULL THEN
      -- Sem intervalo: exit - entry
      EXTRACT(EPOCH FROM (
        MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) - MAX(CASE WHEN punch_type = 'entry' THEN punch_time END)
      )) / 3600
    ELSE NULL
  END as total_hours
FROM attendance_punches
GROUP BY employee_id, date;

-- Inserir configurações padrão do sistema
INSERT INTO system_settings (system_name, company_name)
VALUES ('Sistema RH - Controle de Frequência', 'Minha Empresa')
ON CONFLICT DO NOTHING;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Banco de dados inicializado com sucesso!';
  RAISE NOTICE '📊 Tabelas criadas: users, positions, departments, sectors, units, schedules, employees, attendance, attendance_punches, employee_vacations, holidays';
  RAISE NOTICE '🔍 Índices criados para otimização de performance';
  RAISE NOTICE '📈 View attendance_daily criada para relatórios';
END $$;
