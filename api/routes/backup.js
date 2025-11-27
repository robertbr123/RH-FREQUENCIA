import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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

    console.log('🔄 Gerando backup do banco de dados...');

    // Buscar todas as tabelas
    const tables = [
      'users',
      'employees',
      'positions',
      'departments',
      'sectors',
      'schedules',
      'units',
      'attendance',
      'attendance_punches',
      'holidays',
      'absences',
      'organization_settings'
    ];

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

        sqlBackup += `-- Dados da tabela: ${table}\n`;
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
        console.log(`Tabela ${table} não existe ou erro ao exportar:`, error.message);
        sqlBackup += `-- Tabela ${table} não encontrada\n\n`;
      }
    }

    // Reabilitar constraints
    sqlBackup += `-- Reabilitar constraints\n`;
    sqlBackup += `SET session_replication_role = 'origin';\n\n`;

    // Resetar sequences
    sqlBackup += `-- Resetar sequences\n`;
    for (const table of tables) {
      sqlBackup += `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true);\n`;
    }

    console.log('✅ Backup gerado com sucesso!');

    res.json({
      success: true,
      backup: sqlBackup,
      tables: tables.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao gerar backup:', error);
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

    console.log('🔄 Restaurando backup do banco de dados...');

    // Executar SQL de restore
    await pool.query(sqlBackup);

    console.log('✅ Backup restaurado com sucesso!');

    res.json({
      success: true,
      message: 'Backup restaurado com sucesso!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error);
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

    // Buscar informações de cada tabela
    const tables = [
      'users',
      'employees',
      'positions',
      'departments',
      'sectors',
      'schedules',
      'units',
      'attendance',
      'attendance_punches',
      'holidays',
      'absences',
      'organization_settings'
    ];

    const tableInfo = [];

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        tableInfo.push({
          name: table,
          rows: parseInt(result.rows[0].count)
        });
      } catch (error) {
        tableInfo.push({
          name: table,
          rows: 0,
          error: 'Tabela não encontrada'
        });
      }
    }

    res.json({
      success: true,
      tables: tableInfo,
      totalTables: tableInfo.length,
      totalRows: tableInfo.reduce((sum, t) => sum + t.rows, 0)
    });

  } catch (error) {
    console.error('❌ Erro ao buscar informações do banco:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar informações',
      details: error.message 
    });
  }
});

export default router;
