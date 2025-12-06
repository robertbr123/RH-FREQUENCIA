-- =====================================================
-- MIGRAÇÃO: Portal do Funcionário
-- Data: 2024-12-04
-- Descrição: Adiciona tabelas para autenticação e 
--            solicitações do portal do funcionário
-- =====================================================

-- 0. Garantir que a coluna CPF existe na tabela employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);

-- Criar índice único para CPF (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_employees_cpf_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_employees_cpf_unique ON employees(cpf) WHERE cpf IS NOT NULL;
  END IF;
END
$$;

-- 1. Tabela de credenciais do portal do funcionário
CREATE TABLE IF NOT EXISTS employee_portal_credentials (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  password_hash VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de solicitações do funcionário
CREATE TABLE IF NOT EXISTS employee_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- 'ponto_ajuste', 'ferias', 'declaracao', 'documento'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled'
  data JSONB, -- Dados específicos da solicitação
  justification TEXT,
  attachment_url TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  review_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);

-- 3. Tabela de notificações do funcionário
CREATE TABLE IF NOT EXISTS employee_notifications (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
  is_read BOOLEAN DEFAULT false,
  link VARCHAR(255), -- Link opcional para ação
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_employee_portal_credentials_employee_id 
  ON employee_portal_credentials(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_requests_employee_id 
  ON employee_requests(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_requests_status 
  ON employee_requests(status);

CREATE INDEX IF NOT EXISTS idx_employee_notifications_employee_id 
  ON employee_notifications(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_notifications_is_read 
  ON employee_notifications(is_read);

-- 5. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_employee_portal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_employee_portal_updated_at'
  ) THEN
    CREATE TRIGGER trigger_employee_portal_updated_at
      BEFORE UPDATE ON employee_portal_credentials
      FOR EACH ROW
      EXECUTE FUNCTION update_employee_portal_updated_at();
  END IF;
END
$$;

-- Alternativa: DROP e CREATE (descomentado para reruns)
-- DROP TRIGGER IF EXISTS trigger_employee_portal_updated_at ON employee_portal_credentials;
-- CREATE TRIGGER trigger_employee_portal_updated_at
--   BEFORE UPDATE ON employee_portal_credentials
--   FOR EACH ROW
--   EXECUTE FUNCTION update_employee_portal_updated_at();

-- 6. Comentários nas tabelas
COMMENT ON TABLE employee_portal_credentials IS 'Credenciais de acesso do portal do funcionário';
COMMENT ON TABLE employee_requests IS 'Solicitações feitas pelos funcionários (ajustes, férias, etc)';
COMMENT ON TABLE employee_notifications IS 'Notificações para os funcionários';

COMMENT ON COLUMN employee_portal_credentials.must_change_password IS 'Se true, força troca de senha no próximo login';
COMMENT ON COLUMN employee_portal_credentials.login_attempts IS 'Tentativas de login falhas consecutivas';
COMMENT ON COLUMN employee_portal_credentials.locked_until IS 'Conta bloqueada até esta data/hora';

COMMENT ON COLUMN employee_requests.request_type IS 'Tipo: ponto_ajuste, ferias, declaracao, documento';
COMMENT ON COLUMN employee_requests.status IS 'Status: pending, approved, rejected, cancelled';
COMMENT ON COLUMN employee_requests.data IS 'JSON com dados específicos do tipo de solicitação';
