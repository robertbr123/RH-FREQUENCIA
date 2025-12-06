-- Migração: Sistema de Permissões por Nível de Acesso
-- Data: 2025-12-03

-- Tabela de permissões por role
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'gestor', 'operador')),
  permission_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, permission_key)
);

-- Inserir permissões padrão para cada role

-- ==========================================
-- ADMIN - Acesso total por padrão
-- ==========================================
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
-- Dashboard
('admin', 'dashboard.view', true),
('admin', 'dashboard.stats', true),
-- Funcionários
('admin', 'employees.view', true),
('admin', 'employees.create', true),
('admin', 'employees.edit', true),
('admin', 'employees.delete', true),
('admin', 'employees.import', true),
('admin', 'employees.export', true),
('admin', 'employees.face_register', true),
-- Frequência/Ponto
('admin', 'attendance.view', true),
('admin', 'attendance.register', true),
('admin', 'attendance.edit', true),
('admin', 'attendance.delete', true),
('admin', 'attendance.admin', true),
-- Scanner
('admin', 'scanner.view', true),
('admin', 'scanner.qr', true),
('admin', 'scanner.face', true),
-- Banco de Horas
('admin', 'hourbank.view', true),
('admin', 'hourbank.edit', true),
-- Relatórios
('admin', 'reports.view', true),
('admin', 'reports.generate', true),
('admin', 'reports.export', true),
-- Organização
('admin', 'organization.view', true),
('admin', 'organization.departments', true),
('admin', 'organization.positions', true),
('admin', 'organization.sectors', true),
('admin', 'organization.units', true),
('admin', 'organization.schedules', true),
('admin', 'organization.holidays', true),
-- Usuários
('admin', 'users.view', true),
('admin', 'users.create', true),
('admin', 'users.edit', true),
('admin', 'users.delete', true),
-- Configurações
('admin', 'settings.view', true),
('admin', 'settings.edit', true),
('admin', 'settings.geolocation', true),
('admin', 'settings.permissions', true),
-- Backup
('admin', 'backup.view', true),
('admin', 'backup.create', true),
('admin', 'backup.restore', true)
ON CONFLICT (role, permission_key) DO NOTHING;

-- ==========================================
-- GESTOR - Acesso intermediário
-- ==========================================
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
-- Dashboard
('gestor', 'dashboard.view', true),
('gestor', 'dashboard.stats', true),
-- Funcionários
('gestor', 'employees.view', true),
('gestor', 'employees.create', false),
('gestor', 'employees.edit', false),
('gestor', 'employees.delete', false),
('gestor', 'employees.import', false),
('gestor', 'employees.export', true),
('gestor', 'employees.face_register', true),
-- Frequência/Ponto
('gestor', 'attendance.view', true),
('gestor', 'attendance.register', true),
('gestor', 'attendance.edit', true),
('gestor', 'attendance.delete', false),
('gestor', 'attendance.admin', true),
-- Scanner
('gestor', 'scanner.view', true),
('gestor', 'scanner.qr', true),
('gestor', 'scanner.face', true),
-- Banco de Horas
('gestor', 'hourbank.view', true),
('gestor', 'hourbank.edit', false),
-- Relatórios
('gestor', 'reports.view', true),
('gestor', 'reports.generate', true),
('gestor', 'reports.export', true),
-- Organização
('gestor', 'organization.view', true),
('gestor', 'organization.departments', false),
('gestor', 'organization.positions', false),
('gestor', 'organization.sectors', false),
('gestor', 'organization.units', false),
('gestor', 'organization.schedules', false),
('gestor', 'organization.holidays', false),
-- Usuários
('gestor', 'users.view', false),
('gestor', 'users.create', false),
('gestor', 'users.edit', false),
('gestor', 'users.delete', false),
-- Configurações
('gestor', 'settings.view', false),
('gestor', 'settings.edit', false),
('gestor', 'settings.geolocation', false),
('gestor', 'settings.permissions', false),
-- Backup
('gestor', 'backup.view', false),
('gestor', 'backup.create', false),
('gestor', 'backup.restore', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- ==========================================
-- OPERADOR - Acesso básico
-- ==========================================
INSERT INTO role_permissions (role, permission_key, enabled) VALUES
-- Dashboard
('operador', 'dashboard.view', true),
('operador', 'dashboard.stats', false),
-- Funcionários
('operador', 'employees.view', true),
('operador', 'employees.create', false),
('operador', 'employees.edit', false),
('operador', 'employees.delete', false),
('operador', 'employees.import', false),
('operador', 'employees.export', false),
('operador', 'employees.face_register', false),
-- Frequência/Ponto
('operador', 'attendance.view', true),
('operador', 'attendance.register', true),
('operador', 'attendance.edit', false),
('operador', 'attendance.delete', false),
('operador', 'attendance.admin', false),
-- Scanner
('operador', 'scanner.view', true),
('operador', 'scanner.qr', true),
('operador', 'scanner.face', true),
-- Banco de Horas
('operador', 'hourbank.view', false),
('operador', 'hourbank.edit', false),
-- Relatórios
('operador', 'reports.view', false),
('operador', 'reports.generate', false),
('operador', 'reports.export', false),
-- Organização
('operador', 'organization.view', false),
('operador', 'organization.departments', false),
('operador', 'organization.positions', false),
('operador', 'organization.sectors', false),
('operador', 'organization.units', false),
('operador', 'organization.schedules', false),
('operador', 'organization.holidays', false),
-- Usuários
('operador', 'users.view', false),
('operador', 'users.create', false),
('operador', 'users.edit', false),
('operador', 'users.delete', false),
-- Configurações
('operador', 'settings.view', false),
('operador', 'settings.edit', false),
('operador', 'settings.geolocation', false),
('operador', 'settings.permissions', false),
-- Backup
('operador', 'backup.view', false),
('operador', 'backup.create', false),
('operador', 'backup.restore', false)
ON CONFLICT (role, permission_key) DO NOTHING;

-- Índice para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON role_permissions(permission_key);
