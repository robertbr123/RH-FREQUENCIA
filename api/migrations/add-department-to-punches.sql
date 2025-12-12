-- Migration: Adicionar department_id em attendance_punches
-- Data: 2025-12-10
-- Descrição: Permite rastrear em qual departamento o funcionário bateu o ponto
--            Necessário para relatórios quando funcionário tem múltiplos departamentos

-- 1. Adicionar coluna department_id
ALTER TABLE attendance_punches 
ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;

-- 2. Criar índice para filtros por departamento
CREATE INDEX IF NOT EXISTS idx_attendance_punches_department ON attendance_punches(department_id);

-- 3. Migrar dados existentes: preencher com departamento principal do funcionário
UPDATE attendance_punches ap
SET department_id = e.department_id
FROM employees e
WHERE ap.employee_id = e.id
AND ap.department_id IS NULL;

-- 4. Comentário
COMMENT ON COLUMN attendance_punches.department_id IS 'Departamento no qual o funcionário bateu o ponto (para multi-departamentos)';

-- Versão simplificada para Neon (execute este bloco):
/*
ALTER TABLE attendance_punches ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_punches_department ON attendance_punches(department_id);
UPDATE attendance_punches ap SET department_id = e.department_id FROM employees e WHERE ap.employee_id = e.id AND ap.department_id IS NULL;
*/
