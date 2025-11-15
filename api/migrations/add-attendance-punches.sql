-- Migration: Sistema de múltiplos pontos por dia
-- Data: 2025-11-10
-- Descrição: Adiciona suporte para 4 pontos diários (entrada, saída intervalo, retorno intervalo, saída)

-- Criar nova tabela para registros de ponto
CREATE TABLE IF NOT EXISTS attendance_punches (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  punch_time TIMESTAMP NOT NULL,
  punch_type VARCHAR(20) NOT NULL CHECK (punch_type IN ('entry', 'break_start', 'break_end', 'exit')),
  schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para performance
  CONSTRAINT unique_punch_per_type UNIQUE (employee_id, date, punch_type)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_attendance_punches_employee ON attendance_punches(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_punches_date ON attendance_punches(date);
CREATE INDEX IF NOT EXISTS idx_attendance_punches_employee_date ON attendance_punches(employee_id, date);

-- Migrar dados antigos da tabela attendance para attendance_punches
INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type, schedule_id)
SELECT 
  employee_id,
  DATE(check_in) as date,
  check_in as punch_time,
  'entry' as punch_type,
  NULL as schedule_id
FROM attendance
WHERE check_in IS NOT NULL;

INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type, schedule_id)
SELECT 
  employee_id,
  DATE(check_in) as date,
  check_out as punch_time,
  'exit' as punch_type,
  NULL as schedule_id
FROM attendance
WHERE check_out IS NOT NULL;

-- Adicionar coluna na tabela employees para schedule_id se não existir
ALTER TABLE employees ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL;

-- Comentários
COMMENT ON TABLE attendance_punches IS 'Registros individuais de ponto - suporta múltiplos pontos por dia';
COMMENT ON COLUMN attendance_punches.punch_type IS 'Tipo: entry (entrada), break_start (saída intervalo), break_end (retorno intervalo), exit (saída final)';
COMMENT ON COLUMN attendance_punches.date IS 'Data do ponto (sem horário)';
COMMENT ON COLUMN attendance_punches.punch_time IS 'Horário exato do registro';

-- Criar view para compatibilidade com consultas antigas
CREATE OR REPLACE VIEW attendance_daily AS
SELECT 
  employee_id,
  date,
  MAX(CASE WHEN punch_type = 'entry' THEN punch_time END) as check_in,
  MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) as break_start,
  MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) as break_end,
  MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) as check_out,
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

COMMENT ON VIEW attendance_daily IS 'View consolidada dos pontos diários com cálculo de horas';
