-- Migração: Adicionar novos campos de configuração ao sistema
-- Data: 2025-11-26
-- Descrição: Expande a tabela system_settings com campos regionais, regras de ponto, notificações e backup

-- Adicionar novos campos à tabela system_settings
ALTER TABLE system_settings
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'dd/MM/yyyy',
  ADD COLUMN IF NOT EXISTS time_format VARCHAR(10) DEFAULT '24h',
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS attendance_tolerance_minutes INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_daily_hours INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS enable_facial_recognition BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_qr_scanner BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_photo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS enable_notifications BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_email_notifications BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_backup_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS backup_frequency_days INTEGER DEFAULT 7;

-- Atualizar registros existentes com valores padrão (caso já existam configurações)
UPDATE system_settings
SET 
  timezone = COALESCE(timezone, 'America/Sao_Paulo'),
  date_format = COALESCE(date_format, 'dd/MM/yyyy'),
  time_format = COALESCE(time_format, '24h'),
  language = COALESCE(language, 'pt-BR'),
  attendance_tolerance_minutes = COALESCE(attendance_tolerance_minutes, 5),
  max_daily_hours = COALESCE(max_daily_hours, 12),
  enable_facial_recognition = COALESCE(enable_facial_recognition, true),
  enable_qr_scanner = COALESCE(enable_qr_scanner, true),
  require_photo = COALESCE(require_photo, false),
  enable_notifications = COALESCE(enable_notifications, true),
  enable_email_notifications = COALESCE(enable_email_notifications, false),
  auto_backup_enabled = COALESCE(auto_backup_enabled, false),
  backup_frequency_days = COALESCE(backup_frequency_days, 7),
  updated_at = CURRENT_TIMESTAMP
WHERE id IS NOT NULL;

-- Verificar resultado
SELECT 
  'Migração concluída com sucesso!' as status,
  COUNT(*) as total_configuracoes
FROM system_settings;
