-- Tabela de férias dos funcionários
CREATE TABLE IF NOT EXISTS employee_vacations (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_dates CHECK (end_date >= start_date),
  CONSTRAINT unique_employee_vacation UNIQUE(employee_id, year, month)
);

-- Índices para performance
CREATE INDEX idx_vacations_employee ON employee_vacations(employee_id);
CREATE INDEX idx_vacations_year_month ON employee_vacations(year, month);
CREATE INDEX idx_vacations_dates ON employee_vacations(start_date, end_date);

-- Comentários
COMMENT ON TABLE employee_vacations IS 'Registro de férias dos funcionários';
COMMENT ON COLUMN employee_vacations.month IS 'Mês principal das férias (1-12)';
COMMENT ON COLUMN employee_vacations.days IS 'Quantidade de dias de férias';
