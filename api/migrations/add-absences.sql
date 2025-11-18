-- Criar tabela para registrar ausências (folgas, atestados, etc)
CREATE TABLE IF NOT EXISTS employee_absences (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  absence_type VARCHAR(50) NOT NULL, -- 'folga', 'atestado', 'licenca', 'outros'
  observation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Índices para melhorar performance
CREATE INDEX idx_absences_employee ON employee_absences(employee_id);
CREATE INDEX idx_absences_dates ON employee_absences(start_date, end_date);

-- Comentários
COMMENT ON TABLE employee_absences IS 'Registra ausências justificadas de funcionários (folgas, atestados, etc)';
COMMENT ON COLUMN employee_absences.absence_type IS 'Tipo de ausência: folga, atestado, licenca, outros';
COMMENT ON COLUMN employee_absences.observation IS 'Observações ou justificativa da ausência';
