-- Migração para adicionar suporte a geolocalização nos registros de ponto
-- Execute este SQL no seu banco de dados Neon

-- Adicionar colunas de geolocalização na tabela attendance_punches
ALTER TABLE attendance_punches 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(10, 2);

-- Comentários para documentação
COMMENT ON COLUMN attendance_punches.latitude IS 'Latitude do local onde o ponto foi registrado';
COMMENT ON COLUMN attendance_punches.longitude IS 'Longitude do local onde o ponto foi registrado';
COMMENT ON COLUMN attendance_punches.location_accuracy IS 'Precisão da localização em metros';

-- Índice para consultas por localização (opcional, para futuras análises)
CREATE INDEX IF NOT EXISTS idx_attendance_location 
ON attendance_punches (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Tabela para armazenar locais permitidos (opcional)
CREATE TABLE IF NOT EXISTS allowed_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters DECIMAL(10, 2) DEFAULT 100, -- Raio de tolerância em metros
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir local padrão (exemplo - ajuste para seu endereço real)
-- INSERT INTO allowed_locations (name, description, latitude, longitude, radius_meters) 
-- VALUES ('Escritório Principal', 'Sede da empresa', -9.9747, -67.8249, 150);
