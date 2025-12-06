-- Migração: Permitir múltiplos departamentos por gestor
-- Data: 2025-12-03

-- Tabela de relacionamento entre usuários e departamentos (N:N)
CREATE TABLE IF NOT EXISTS user_departments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, department_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_departments_user ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept ON user_departments(department_id);

-- Migrar dados existentes da coluna department_id para a nova tabela
INSERT INTO user_departments (user_id, department_id)
SELECT id, department_id 
FROM users 
WHERE department_id IS NOT NULL AND role = 'gestor'
ON CONFLICT (user_id, department_id) DO NOTHING;

-- Comentário: A coluna department_id na tabela users será mantida por compatibilidade
-- mas a nova lógica usará a tabela user_departments para gestores
