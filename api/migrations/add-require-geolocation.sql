-- Migração para adicionar campo require_geolocation nas configurações do sistema
-- Execute este SQL no seu banco de dados Neon

-- Adicionar coluna require_geolocation na tabela system_settings
ALTER TABLE system_settings 
ADD COLUMN IF NOT EXISTS require_geolocation BOOLEAN DEFAULT false;

-- Comentário para documentação
COMMENT ON COLUMN system_settings.require_geolocation IS 'Se true, exige validação de geolocalização ao bater ponto no Scanner';
