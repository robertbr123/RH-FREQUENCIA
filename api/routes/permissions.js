import express from 'express';
import pool, { queryWithRetry } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Definição de todas as permissões disponíveis
const PERMISSION_DEFINITIONS = {
  dashboard: {
    label: 'Dashboard',
    icon: 'Home',
    permissions: [
      { key: 'dashboard.view', label: 'Visualizar Dashboard', description: 'Acesso à página inicial do sistema' },
      { key: 'dashboard.stats', label: 'Ver Estatísticas', description: 'Visualizar estatísticas e métricas' }
    ]
  },
  employees: {
    label: 'Funcionários',
    icon: 'Users',
    permissions: [
      { key: 'employees.view', label: 'Visualizar Funcionários', description: 'Ver lista de funcionários' },
      { key: 'employees.create', label: 'Cadastrar Funcionários', description: 'Adicionar novos funcionários' },
      { key: 'employees.edit', label: 'Editar Funcionários', description: 'Modificar dados de funcionários' },
      { key: 'employees.delete', label: 'Excluir Funcionários', description: 'Remover funcionários do sistema' },
      { key: 'employees.import', label: 'Importar CSV', description: 'Importar funcionários via CSV' },
      { key: 'employees.export', label: 'Exportar Dados', description: 'Exportar lista de funcionários' },
      { key: 'employees.face_register', label: 'Cadastrar Face', description: 'Registrar reconhecimento facial' }
    ]
  },
  attendance: {
    label: 'Frequência',
    icon: 'Clock',
    permissions: [
      { key: 'attendance.view', label: 'Visualizar Frequência', description: 'Ver registros de ponto' },
      { key: 'attendance.register', label: 'Registrar Ponto', description: 'Registrar entrada/saída' },
      { key: 'attendance.edit', label: 'Editar Registros', description: 'Modificar registros de ponto' },
      { key: 'attendance.delete', label: 'Excluir Registros', description: 'Remover registros de ponto' },
      { key: 'attendance.admin', label: 'Administrar Frequência', description: 'Acesso ao gerenciamento completo de pontos' }
    ]
  },
  scanner: {
    label: 'Scanner',
    icon: 'QrCode',
    permissions: [
      { key: 'scanner.view', label: 'Acessar Scanner', description: 'Ver página do scanner' },
      { key: 'scanner.qr', label: 'Usar QR Code', description: 'Registrar ponto via QR Code' },
      { key: 'scanner.face', label: 'Usar Facial', description: 'Registrar ponto via reconhecimento facial' }
    ]
  },
  hourbank: {
    label: 'Banco de Horas',
    icon: 'Clock',
    permissions: [
      { key: 'hourbank.view', label: 'Visualizar Banco de Horas', description: 'Ver saldos de banco de horas' },
      { key: 'hourbank.edit', label: 'Editar Banco de Horas', description: 'Ajustar saldos de banco de horas' }
    ]
  },
  reports: {
    label: 'Relatórios',
    icon: 'FileText',
    permissions: [
      { key: 'reports.view', label: 'Visualizar Relatórios', description: 'Acessar página de relatórios' },
      { key: 'reports.generate', label: 'Gerar Relatórios', description: 'Criar novos relatórios' },
      { key: 'reports.export', label: 'Exportar Relatórios', description: 'Exportar relatórios (PDF, Excel)' }
    ]
  },
  organization: {
    label: 'Organização',
    icon: 'Building',
    permissions: [
      { key: 'organization.view', label: 'Visualizar Organização', description: 'Acessar estrutura organizacional' },
      { key: 'organization.departments', label: 'Gerenciar Departamentos', description: 'CRUD de departamentos' },
      { key: 'organization.positions', label: 'Gerenciar Cargos', description: 'CRUD de cargos' },
      { key: 'organization.sectors', label: 'Gerenciar Setores', description: 'CRUD de setores' },
      { key: 'organization.units', label: 'Gerenciar Unidades', description: 'CRUD de unidades' },
      { key: 'organization.schedules', label: 'Gerenciar Horários', description: 'CRUD de horários de trabalho' },
      { key: 'organization.holidays', label: 'Gerenciar Feriados', description: 'CRUD de feriados' }
    ]
  },
  users: {
    label: 'Usuários',
    icon: 'UserCog',
    permissions: [
      { key: 'users.view', label: 'Visualizar Usuários', description: 'Ver lista de usuários do sistema' },
      { key: 'users.create', label: 'Criar Usuários', description: 'Adicionar novos usuários' },
      { key: 'users.edit', label: 'Editar Usuários', description: 'Modificar dados de usuários' },
      { key: 'users.delete', label: 'Excluir Usuários', description: 'Remover usuários do sistema' }
    ]
  },
  notifications: {
    label: 'Notificações',
    icon: 'Bell',
    permissions: [
      { key: 'notifications.view', label: 'Visualizar Notificações', description: 'Acessar página de notificações' },
      { key: 'notifications.send', label: 'Enviar Notificações', description: 'Enviar notificações para funcionários' },
      { key: 'notifications.manage', label: 'Gerenciar Notificações', description: 'Editar e excluir notificações' }
    ]
  },
  geolocation: {
    label: 'Geolocalização',
    icon: 'MapPin',
    permissions: [
      { key: 'geolocation.view', label: 'Visualizar Localizações', description: 'Ver locais permitidos para ponto' },
      { key: 'geolocation.manage', label: 'Gerenciar Localizações', description: 'Adicionar e remover locais permitidos' }
    ]
  },
  settings: {
    label: 'Configurações',
    icon: 'Settings',
    permissions: [
      { key: 'settings.view', label: 'Visualizar Configurações', description: 'Ver configurações do sistema' },
      { key: 'settings.edit', label: 'Editar Configurações', description: 'Modificar configurações gerais' },
      { key: 'settings.appearance', label: 'Configurar Aparência', description: 'Alterar tema, cores e logo' },
      { key: 'settings.company', label: 'Configurar Empresa', description: 'Dados da empresa' },
      { key: 'settings.attendance', label: 'Configurar Frequência', description: 'Regras de ponto e tolerâncias' },
      { key: 'settings.employee_check', label: 'Configurar Employee Check', description: 'Tela de consulta pública' },
      { key: 'settings.permissions', label: 'Gerenciar Permissões', description: 'Configurar permissões de roles' }
    ]
  },
  backup: {
    label: 'Backup',
    icon: 'Database',
    permissions: [
      { key: 'backup.view', label: 'Visualizar Backups', description: 'Ver informações do banco de dados' },
      { key: 'backup.create', label: 'Criar Backup', description: 'Gerar novo backup do sistema' },
      { key: 'backup.restore', label: 'Restaurar Backup', description: 'Restaurar dados de um backup' }
    ]
  },
  faq: {
    label: 'FAQ / Ajuda',
    icon: 'HelpCircle',
    permissions: [
      { key: 'faq.view', label: 'Visualizar FAQ', description: 'Acessar perguntas frequentes' },
      { key: 'faq.manage', label: 'Gerenciar FAQ', description: 'Adicionar, editar e remover perguntas' }
    ]
  }
};

// GET /api/permissions - Retorna definições e permissões atuais
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Verificar se a tabela existe
    const tableCheck = await queryWithRetry(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'role_permissions'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        definitions: PERMISSION_DEFINITIONS,
        permissions: [],
        initialized: false
      });
    }

    // Buscar todas as permissões
    const result = await queryWithRetry(`
      SELECT id, role, permission_key, enabled, updated_at
      FROM role_permissions
      ORDER BY role, permission_key
    `);

    // Organizar por role
    const permissionsByRole = {};
    result.rows.forEach(row => {
      if (!permissionsByRole[row.role]) {
        permissionsByRole[row.role] = {};
      }
      permissionsByRole[row.role][row.permission_key] = row.enabled;
    });

    res.json({
      definitions: PERMISSION_DEFINITIONS,
      permissions: permissionsByRole,
      initialized: true
    });
  } catch (error) {
    logger.error('Erro ao buscar permissões:', error);
    res.status(500).json({ error: 'Erro ao buscar permissões', details: error.message });
  }
});

// GET /api/permissions/:role - Retorna permissões de um role específico
router.get('/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;
    
    if (!['admin', 'gestor', 'operador'].includes(role)) {
      return res.status(400).json({ error: 'Role inválido' });
    }

    const result = await queryWithRetry(`
      SELECT permission_key, enabled
      FROM role_permissions
      WHERE role = $1
    `, [role]);

    const permissions = {};
    result.rows.forEach(row => {
      permissions[row.permission_key] = row.enabled;
    });

    res.json({ role, permissions });
  } catch (error) {
    logger.error('Erro ao buscar permissões do role:', error);
    res.status(500).json({ error: 'Erro ao buscar permissões', details: error.message });
  }
});

// PUT /api/permissions - Atualiza permissões (admin only)
router.put('/', authenticateToken, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar permissões' });
    }

    const { permissions } = req.body;
    
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'Formato de permissões inválido' });
    }

    // Verificar se a tabela existe
    const tableCheck = await queryWithRetry(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'role_permissions'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      return res.status(400).json({ 
        error: 'Tabela de permissões não existe. Execute a migração primeiro.' 
      });
    }

    // Atualizar cada permissão
    const updates = [];
    for (const role of Object.keys(permissions)) {
      if (!['admin', 'gestor', 'operador'].includes(role)) continue;
      
      for (const [key, enabled] of Object.entries(permissions[role])) {
        updates.push(
          queryWithRetry(`
            INSERT INTO role_permissions (role, permission_key, enabled, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (role, permission_key) 
            DO UPDATE SET enabled = $3, updated_at = CURRENT_TIMESTAMP
          `, [role, key, enabled])
        );
      }
    }

    await Promise.all(updates);

    res.json({ success: true, message: 'Permissões atualizadas com sucesso' });
  } catch (error) {
    logger.error('Erro ao atualizar permissões:', error);
    res.status(500).json({ error: 'Erro ao atualizar permissões', details: error.message });
  }
});

// POST /api/permissions/check - Verifica se o usuário tem uma permissão específica
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { permission_key } = req.body;
    const userRole = req.user.role;

    if (!permission_key) {
      return res.status(400).json({ error: 'Chave de permissão obrigatória' });
    }

    // Admin sempre tem todas as permissões habilitadas por padrão
    // A menos que sejam explicitamente desabilitadas
    const result = await queryWithRetry(`
      SELECT enabled
      FROM role_permissions
      WHERE role = $1 AND permission_key = $2
    `, [userRole, permission_key]);

    // Se não encontrou, assume permissão baseada no role padrão
    if (result.rows.length === 0) {
      // Admin tem tudo, outros não
      return res.json({ 
        allowed: userRole === 'admin',
        permission_key,
        role: userRole
      });
    }

    res.json({ 
      allowed: result.rows[0].enabled,
      permission_key,
      role: userRole
    });
  } catch (error) {
    logger.error('Erro ao verificar permissão:', error);
    res.status(500).json({ error: 'Erro ao verificar permissão', details: error.message });
  }
});

// GET /api/permissions/my - Retorna as permissões do usuário atual
router.get('/my/all', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;

    const result = await queryWithRetry(`
      SELECT permission_key, enabled
      FROM role_permissions
      WHERE role = $1
    `, [userRole]);

    const permissions = {};
    result.rows.forEach(row => {
      permissions[row.permission_key] = row.enabled;
    });

    // Se é admin e não tem permissões cadastradas, dar acesso total
    if (userRole === 'admin' && Object.keys(permissions).length === 0) {
      // Gerar todas as permissões como true para admin
      Object.values(PERMISSION_DEFINITIONS).forEach(category => {
        category.permissions.forEach(perm => {
          permissions[perm.key] = true;
        });
      });
    }

    res.json({ 
      role: userRole,
      permissions,
      definitions: PERMISSION_DEFINITIONS
    });
  } catch (error) {
    logger.error('Erro ao buscar minhas permissões:', error);
    res.status(500).json({ error: 'Erro ao buscar permissões', details: error.message });
  }
});

// POST /api/permissions/initialize - Inicializa as permissões padrão
router.post('/initialize', authenticateToken, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem inicializar permissões' });
    }

    // Verificar se a tabela existe
    const tableCheck = await queryWithRetry(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'role_permissions'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      // Criar a tabela
      await queryWithRetry(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id SERIAL PRIMARY KEY,
          role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'gestor', 'operador')),
          permission_key VARCHAR(100) NOT NULL,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(role, permission_key)
        )
      `);

      await queryWithRetry(`
        CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role)
      `);
      await queryWithRetry(`
        CREATE INDEX IF NOT EXISTS idx_role_permissions_key ON role_permissions(permission_key)
      `);
    }

    // Inserir permissões padrão
    const defaultPermissions = {
      admin: {}, // Admin tem tudo habilitado
      gestor: {  // Gestor tem acesso intermediário
        'employees.create': false,
        'employees.edit': false,
        'employees.delete': false,
        'employees.import': false,
        'attendance.delete': false,
        'hourbank.edit': false,
        'organization.departments': false,
        'organization.positions': false,
        'organization.sectors': false,
        'organization.units': false,
        'organization.schedules': false,
        'organization.holidays': false,
        'users.view': false,
        'users.create': false,
        'users.edit': false,
        'users.delete': false,
        'notifications.manage': false,
        'geolocation.manage': false,
        'settings.view': false,
        'settings.edit': false,
        'settings.appearance': false,
        'settings.company': false,
        'settings.attendance': false,
        'settings.employee_check': false,
        'settings.permissions': false,
        'backup.view': false,
        'backup.create': false,
        'backup.restore': false,
        'faq.manage': false
      },
      operador: { // Operador tem acesso básico
        'dashboard.stats': false,
        'employees.create': false,
        'employees.edit': false,
        'employees.delete': false,
        'employees.import': false,
        'employees.export': false,
        'employees.face_register': false,
        'attendance.edit': false,
        'attendance.delete': false,
        'attendance.admin': false,
        'hourbank.view': false,
        'hourbank.edit': false,
        'reports.view': false,
        'reports.generate': false,
        'reports.export': false,
        'organization.view': false,
        'organization.departments': false,
        'organization.positions': false,
        'organization.sectors': false,
        'organization.units': false,
        'organization.schedules': false,
        'organization.holidays': false,
        'users.view': false,
        'users.create': false,
        'users.edit': false,
        'users.delete': false,
        'notifications.view': false,
        'notifications.send': false,
        'notifications.manage': false,
        'geolocation.view': false,
        'geolocation.manage': false,
        'settings.view': false,
        'settings.edit': false,
        'settings.appearance': false,
        'settings.company': false,
        'settings.attendance': false,
        'settings.employee_check': false,
        'settings.permissions': false,
        'backup.view': false,
        'backup.create': false,
        'backup.restore': false,
        'faq.view': false,
        'faq.manage': false
      }
    };

    // Para cada role e cada permissão definida
    for (const role of ['admin', 'gestor', 'operador']) {
      for (const category of Object.values(PERMISSION_DEFINITIONS)) {
        for (const perm of category.permissions) {
          // Por padrão, tudo habilitado exceto o que está definido como false
          const enabled = defaultPermissions[role][perm.key] !== false;
          
          await queryWithRetry(`
            INSERT INTO role_permissions (role, permission_key, enabled)
            VALUES ($1, $2, $3)
            ON CONFLICT (role, permission_key) DO NOTHING
          `, [role, perm.key, enabled]);
        }
      }
    }

    res.json({ 
      success: true, 
      message: 'Permissões inicializadas com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao inicializar permissões:', error);
    res.status(500).json({ error: 'Erro ao inicializar permissões', details: error.message });
  }
});

export default router;
