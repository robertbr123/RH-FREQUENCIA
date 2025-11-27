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
        company_email: '',
        timezone: 'America/Sao_Paulo',
        date_format: 'dd/MM/yyyy',
        time_format: '24h',
        language: 'pt-BR',
        attendance_tolerance_minutes: 5,
        max_daily_hours: 12,
        enable_facial_recognition: true,
        enable_qr_scanner: true,
        require_photo: false,
        enable_notifications: true,
        enable_email_notifications: false,
        auto_backup_enabled: false,
        backup_frequency_days: 7
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
    company_email,
    timezone,
    date_format,
    time_format,
    language,
    attendance_tolerance_minutes,
    max_daily_hours,
    enable_facial_recognition,
    enable_qr_scanner,
    require_photo,
    enable_notifications,
    enable_email_notifications,
    auto_backup_enabled,
    backup_frequency_days
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
          company_name, company_address, company_phone, company_email,
          timezone, date_format, time_format, language,
          attendance_tolerance_minutes, max_daily_hours,
          enable_facial_recognition, enable_qr_scanner, require_photo,
          enable_notifications, enable_email_notifications,
          auto_backup_enabled, backup_frequency_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
        [
          system_name, primary_color, logo_url, icon_url,
          company_name, company_address, company_phone, company_email,
          timezone, date_format, time_format, language,
          attendance_tolerance_minutes, max_daily_hours,
          enable_facial_recognition, enable_qr_scanner, require_photo,
          enable_notifications, enable_email_notifications,
          auto_backup_enabled, backup_frequency_days
        ]
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
          timezone = $9,
          date_format = $10,
          time_format = $11,
          language = $12,
          attendance_tolerance_minutes = $13,
          max_daily_hours = $14,
          enable_facial_recognition = $15,
          enable_qr_scanner = $16,
          require_photo = $17,
          enable_notifications = $18,
          enable_email_notifications = $19,
          auto_backup_enabled = $20,
          backup_frequency_days = $21,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $22 RETURNING *`,
        [
          system_name, primary_color, logo_url, icon_url,
          company_name, company_address, company_phone, company_email,
          timezone, date_format, time_format, language,
          attendance_tolerance_minutes, max_daily_hours,
          enable_facial_recognition, enable_qr_scanner, require_photo,
          enable_notifications, enable_email_notifications,
          auto_backup_enabled, backup_frequency_days,
          existing.rows[0].id
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar configurações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

export default router;
