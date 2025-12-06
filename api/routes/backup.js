import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Lista completa de tabelas do sistema (ordem de dependência para restore)
const ALL_TABLES = [
  // Tabelas base (sem dependências)
  'users',
  'positions',
  'departments',
  'sectors',
  'schedules',
  'units',
  'holidays',
  'system_settings',
  'role_permissions',
  'allowed_locations',
  'faq',
  
  // Tabelas com dependência de tabelas base
  'employees',
  'user_departments',
  
  // Tabelas com dependência de employees
  'attendance',
  'attendance_punches',
  'employee_absences',
  'employee_vacations',
  'employee_portal_credentials',
  'employee_requests',
  'employee_notifications',
  'employee_notification_settings',
  'push_subscriptions',
  
  // Tabelas de chat
  'chat_conversations',
  'chat_messages',
];

// Gerar backup completo do banco (apenas admin)
router.post('/export', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Verificar se é admin
    const userCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (!userCheck.rows[0] || userCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem gerar backups' });
    }

    logger.info('Gerando backup do banco de dados...');

    // Usar lista completa de tabelas
    const tables = ALL_TABLES;
    let exportedTables = 0;

    let sqlBackup = `-- BACKUP DO BANCO DE DADOS\n`;
    sqlBackup += `-- Data: ${new Date().toISOString()}\n`;
    sqlBackup += `-- Sistema: RHF - Reconhecimento Facial\n\n`;

    // Desabilitar constraints temporariamente
    sqlBackup += `-- Desabilitar constraints\n`;
    sqlBackup += `SET session_replication_role = 'replica';\n\n`;

    // Exportar dados de cada tabela
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table}`);
        
        if (result.rows.length === 0) {
          sqlBackup += `-- Tabela ${table} está vazia\n\n`;
          continue;
        }

        exportedTables++;
        sqlBackup += `-- Dados da tabela: ${table} (${result.rows.length} registros)\n`;
        sqlBackup += `DELETE FROM ${table};\n`;

        const columns = Object.keys(result.rows[0]);
        const columnsList = columns.join(', ');

        for (const row of result.rows) {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'number') return value;
            if (typeof value === 'boolean') return value;
            if (value instanceof Date) return `'${value.toISOString()}'`;
            // Escapar aspas simples
            const escaped = String(value).replace(/'/g, "''");
            return `'${escaped}'`;
          });

          sqlBackup += `INSERT INTO ${table} (${columnsList}) VALUES (${values.join(', ')});\n`;
        }

        sqlBackup += `\n`;
      } catch (error) {
        logger.debug(`Tabela ${table} não existe ou erro ao exportar:`, { error: error.message });
        sqlBackup += `-- Tabela ${table} não encontrada\n\n`;
      }
    }

    // Reabilitar constraints
    sqlBackup += `-- Reabilitar constraints\n`;
    sqlBackup += `SET session_replication_role = 'origin';\n\n`;

    // Resetar sequences
    sqlBackup += `-- Resetar sequences\n`;
    for (const table of tables) {
      sqlBackup += `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${table}' AND column_name = 'id') THEN PERFORM setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true); END IF; END $$;\n`;
    }

    logger.info('Backup gerado com sucesso!', { tables: exportedTables });

    res.json({
      success: true,
      backup: sqlBackup,
      tables: exportedTables,
      totalTables: tables.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erro ao gerar backup:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar backup',
      details: error.message 
    });
  }
});

// Restaurar backup (apenas admin)
router.post('/restore', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { sqlBackup } = req.body;

    if (!sqlBackup) {
      return res.status(400).json({ error: 'SQL de backup não fornecido' });
    }

    // Verificar se é admin
    const userCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (!userCheck.rows[0] || userCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem restaurar backups' });
    }

    // Validação básica de segurança - verificar se é um backup válido do sistema
    if (!sqlBackup.includes('-- BACKUP DO BANCO DE DADOS') && !sqlBackup.includes('-- Sistema: RHF')) {
      return res.status(400).json({ error: 'Arquivo de backup inválido ou não reconhecido' });
    }

    // Bloquear comandos perigosos
    const dangerousCommands = ['DROP DATABASE', 'DROP SCHEMA', 'TRUNCATE', 'ALTER USER', 'CREATE USER', 'GRANT', 'REVOKE'];
    for (const cmd of dangerousCommands) {
      if (sqlBackup.toUpperCase().includes(cmd)) {
        return res.status(400).json({ error: `Comando não permitido detectado: ${cmd}` });
      }
    }

    logger.info('Restaurando backup do banco de dados...', { userId });

    // Executar SQL de restore
    await pool.query(sqlBackup);

    logger.info('Backup restaurado com sucesso!');

    res.json({
      success: true,
      message: 'Backup restaurado com sucesso!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Erro ao restaurar backup:', error);
    res.status(500).json({ 
      error: 'Erro ao restaurar backup',
      details: error.message 
    });
  }
});

// Informações sobre o banco (apenas admin)
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;

    // Verificar se é admin
    const userCheck = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (!userCheck.rows[0] || userCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem acessar informações do banco' });
    }

    // Usar lista completa de tabelas
    const tables = ALL_TABLES;

    const tableInfo = [];
    let existingTables = 0;

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        tableInfo.push({
          name: table,
          rows: parseInt(result.rows[0].count),
          exists: true
        });
        existingTables++;
      } catch (error) {
        tableInfo.push({
          name: table,
          rows: 0,
          exists: false,
          error: 'Tabela não encontrada'
        });
      }
    }

    res.json({
      success: true,
      tables: tableInfo,
      totalTables: tables.length,
      existingTables,
      totalRows: tableInfo.reduce((sum, t) => sum + t.rows, 0)
    });

  } catch (error) {
    logger.error('Erro ao buscar informações do banco:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar informações',
      details: error.message 
    });
  }
});

export default router;
