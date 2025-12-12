-- Migração: Permitir múltiplos departamentos por funcionário com horários diferentes
-- Data: 2025-12-10
-- Descrição: Cria tabela de relacionamento N:N entre employees e departments,
--            permitindo que cada funcionário tenha um horário específico por departamento

-- =====================================================
-- 1. CRIAR TABELA DE RELACIONAMENTO
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_departments (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
  is_primary BOOLEAN DEFAULT false,
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, department_id)
);

-- =====================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employee_departments_employee ON employee_departments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_departments_department ON employee_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_departments_schedule ON employee_departments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_employee_departments_primary ON employee_departments(employee_id, is_primary) WHERE is_primary = true;

-- =====================================================
-- 3. MIGRAR DADOS EXISTENTES
-- =====================================================

-- Inserir vínculos existentes na nova tabela (funcionários que já têm department_id)
INSERT INTO employee_departments (employee_id, department_id, schedule_id, is_primary, start_date)
SELECT 
  id as employee_id,
  department_id,
  schedule_id,
  true as is_primary,
  COALESCE(hire_date, CURRENT_DATE) as start_date
FROM employees 
WHERE department_id IS NOT NULL
ON CONFLICT (employee_id, department_id) DO NOTHING;

-- =====================================================
-- 4. FUNÇÃO PARA GARANTIR APENAS UM DEPARTAMENTO PRIMÁRIO
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_single_primary_department()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o novo registro é primário, remover o flag de outros departamentos do mesmo funcionário
  IF NEW.is_primary = true THEN
    UPDATE employee_departments 
    SET is_primary = false, updated_at = CURRENT_TIMESTAMP
    WHERE employee_id = NEW.employee_id 
      AND id != NEW.id 
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CRIAR TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS trigger_single_primary_department ON employee_departments;

CREATE TRIGGER trigger_single_primary_department
AFTER INSERT OR UPDATE OF is_primary ON employee_departments
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION ensure_single_primary_department();

-- =====================================================
-- 6. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE employee_departments IS 'Tabela de relacionamento N:N entre funcionários e departamentos, permitindo múltiplos vínculos com horários diferentes';
COMMENT ON COLUMN employee_departments.is_primary IS 'Indica se este é o departamento principal do funcionário (usado em relatórios)';
COMMENT ON COLUMN employee_departments.schedule_id IS 'Horário de trabalho específico para este departamento';
COMMENT ON COLUMN employee_departments.start_date IS 'Data de início do funcionário neste departamento';
COMMENT ON COLUMN employee_departments.end_date IS 'Data de término (NULL se ainda ativo)';

-- =====================================================
-- NOTA: Manter colunas department_id e schedule_id em employees
-- para retrocompatibilidade. A nova lógica usará employee_departments
-- mas o sistema continuará funcionando com a estrutura antiga.
-- =====================================================
