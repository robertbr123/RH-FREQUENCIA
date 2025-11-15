-- Migration: Adicionar colunas year e month à tabela employee_vacations
-- Data: 2024-11-14
-- Descrição: Adiciona as colunas year e month para melhor controle de férias

-- Adicionar colunas year e month
ALTER TABLE employee_vacations ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE employee_vacations ADD COLUMN IF NOT EXISTS month INTEGER CHECK (month >= 1 AND month <= 12);

-- Criar índice para year e month
CREATE INDEX IF NOT EXISTS idx_vacations_year_month ON employee_vacations(year, month);

-- Adicionar constraint de unicidade (remover se já existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_employee_vacation'
  ) THEN
    ALTER TABLE employee_vacations 
    ADD CONSTRAINT unique_employee_vacation UNIQUE(employee_id, year, month);
  END IF;
END $$;

-- Adicionar constraint de validação de datas se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_dates'
  ) THEN
    ALTER TABLE employee_vacations 
    ADD CONSTRAINT check_dates CHECK (end_date >= start_date);
  END IF;
END $$;

-- Atualizar registros existentes (se houver) com base nas datas
UPDATE employee_vacations 
SET 
  year = EXTRACT(YEAR FROM start_date)::INTEGER,
  month = EXTRACT(MONTH FROM start_date)::INTEGER
WHERE year IS NULL OR month IS NULL;

-- Tornar as colunas NOT NULL após preencher os dados existentes
ALTER TABLE employee_vacations ALTER COLUMN year SET NOT NULL;
ALTER TABLE employee_vacations ALTER COLUMN month SET NOT NULL;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '📅 Colunas year e month adicionadas à tabela employee_vacations';
  RAISE NOTICE '🔍 Índices e constraints criados';
END $$;
