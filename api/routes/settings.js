import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Buscar configurações do sistema
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings ORDER BY id LIMIT 1');
    
    if (result.rows.length === 0) {
      // Retornar configurações padrão
      return res.json({
        system_name: 'RH System',
        primary_color: '#3b82f6',
        logo_url: '',
        icon_url: '',
        company_name: 'Empresa',
        company_address: '',
        company_phone: '',
        company_email: ''
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Atualizar configurações (apenas admin)
router.put('/', authenticateToken, isAdmin, async (req, res) => {
  const {
    system_name,
    primary_color,
    logo_url,
    icon_url,
    company_name,
    company_address,
    company_phone,
    company_email
  } = req.body;

  try {
    // Verificar se já existe configuração
    const existing = await pool.query('SELECT id FROM system_settings LIMIT 1');
    
    let result;
    if (existing.rows.length === 0) {
      // Criar nova configuração
      result = await pool.query(
        `INSERT INTO system_settings (
          system_name, primary_color, logo_url, icon_url,
          company_name, company_address, company_phone, company_email
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [system_name, primary_color, logo_url, icon_url, company_name, company_address, company_phone, company_email]
      );
    } else {
      // Atualizar configuração existente
      result = await pool.query(
        `UPDATE system_settings SET
          system_name = $1,
          primary_color = $2,
          logo_url = $3,
          icon_url = $4,
          company_name = $5,
          company_address = $6,
          company_phone = $7,
          company_email = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9 RETURNING *`,
        [system_name, primary_color, logo_url, icon_url, company_name, company_address, company_phone, company_email, existing.rows[0].id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

export default router;
