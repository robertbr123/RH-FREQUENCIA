import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Endpoint temporário para criar tabela de feriados
// EXECUTAR APENAS UMA VEZ e depois remover da API
router.post('/run', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Verificar se usuário é admin
    const userCheck = await client.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (!userCheck.rows[0] || userCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem executar migrações' });
    }

    await client.query('BEGIN');

    // Criar tabela holidays
    await client.query(`
      CREATE TABLE IF NOT EXISTS holidays (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('municipal', 'estadual', 'federal', 'facultativo')),
        description TEXT,
        recurring BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(type)
    `);

    // Verificar se já existem dados
    const existingData = await client.query('SELECT COUNT(*) FROM holidays');
    
    if (parseInt(existingData.rows[0].count) === 0) {
      // Inserir feriados nacionais brasileiros de 2024
      await client.query(`
        INSERT INTO holidays (name, date, type, recurring) VALUES
          ('Ano Novo', '2024-01-01', 'federal', true),
          ('Tiradentes', '2024-04-21', 'federal', true),
          ('Dia do Trabalho', '2024-05-01', 'federal', true),
          ('Independência do Brasil', '2024-09-07', 'federal', true),
          ('Nossa Senhora Aparecida', '2024-10-12', 'federal', true),
          ('Finados', '2024-11-02', 'federal', true),
          ('Proclamação da República', '2024-11-15', 'federal', true),
          ('Consciência Negra', '2024-11-20', 'federal', true),
          ('Natal', '2024-12-25', 'federal', true)
      `);
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: 'Tabela holidays criada com sucesso!',
      recordsInserted: parseInt(existingData.rows[0].count) === 0 ? 9 : 0
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro na migração:', error);
    res.status(500).json({ 
      error: 'Erro ao executar migração', 
      details: error.message 
    });
  } finally {
    client.release();
  }
});

export default router;
