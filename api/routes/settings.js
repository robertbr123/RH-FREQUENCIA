import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import cache, { CACHE_TTL, CACHE_KEYS } from '../utils/cache.js';

const router = express.Router();

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Configurações padrão
const DEFAULT_SETTINGS = {
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
  require_geolocation: false,
  require_photo: false,
  enable_notifications: true,
  enable_email_notifications: false,
  auto_backup_enabled: false,
  backup_frequency_days: 7,
  // Configurações de propaganda
  ad_enabled: true,
  ad_title: 'Prefeitura Municipal de Ipixuna',
  ad_subtitle: 'Juntos por um novo tempo',
  ad_image_url: '',
  ad_bg_color_from: '#15803d',
  ad_bg_color_to: '#16a34a',
  ad_delay_seconds: 3,
  // Configurações do EmployeeCheck
  ec_show_photo: true,
  ec_show_matricula: true,
  ec_show_position: true,
  ec_show_department: true,
  ec_show_punctuality: true,
  ec_show_graph: true,
  ec_show_stats: true,
  ec_show_vacation_holidays: true,
  ec_show_records_list: true,
  ec_records_limit: 10,
  ec_custom_title: 'Consulta de Frequência',
  ec_custom_subtitle: 'Digite seu CPF para verificar seus registros de ponto'
};

// Buscar configurações do sistema
router.get('/', authenticateToken, async (req, res) => {
  try {
    const settings = await cache.getOrFetch(
      CACHE_KEYS.SETTINGS,
      async () => {
        const result = await pool.query('SELECT * FROM system_settings ORDER BY id LIMIT 1');
        return result.rows.length > 0 ? result.rows[0] : DEFAULT_SETTINGS;
      },
      CACHE_TTL.SETTINGS
    );
    
    res.json(settings);
  } catch (error) {
    logger.error('Erro ao buscar configurações', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Endpoint PÚBLICO para buscar configurações básicas (geolocalização, etc.)
router.get('/public', async (req, res) => {
  try {
    const settings = await cache.getOrFetch(
      'settings:public',
      async () => {
        const result = await pool.query('SELECT require_geolocation FROM system_settings ORDER BY id LIMIT 1');
        return result.rows.length > 0 ? result.rows[0] : { require_geolocation: false };
      },
      CACHE_TTL.SETTINGS
    );
    
    res.json({ require_geolocation: settings.require_geolocation || false });
  } catch (error) {
    logger.error('Erro ao buscar configurações públicas', error);
    res.json({ require_geolocation: false });
  }
});

// Endpoint PÚBLICO para buscar configurações do EmployeeCheck
router.get('/employee-check', async (req, res) => {
  try {
    const settings = await cache.getOrFetch(
      'settings:employee-check',
      async () => {
        const result = await pool.query(`
          SELECT 
            ad_enabled, ad_title, ad_subtitle, ad_image_url,
            ad_bg_color_from, ad_bg_color_to, ad_delay_seconds,
            ec_show_photo, ec_show_matricula, ec_show_position, ec_show_department,
            ec_show_punctuality, ec_show_graph, ec_show_stats, ec_show_vacation_holidays,
            ec_show_records_list, ec_records_limit, ec_custom_title, ec_custom_subtitle
          FROM system_settings ORDER BY id LIMIT 1
        `);
        
        if (result.rows.length === 0) {
          return {
            ad_enabled: DEFAULT_SETTINGS.ad_enabled,
            ad_title: DEFAULT_SETTINGS.ad_title,
            ad_subtitle: DEFAULT_SETTINGS.ad_subtitle,
            ad_image_url: DEFAULT_SETTINGS.ad_image_url,
            ad_bg_color_from: DEFAULT_SETTINGS.ad_bg_color_from,
            ad_bg_color_to: DEFAULT_SETTINGS.ad_bg_color_to,
            ad_delay_seconds: DEFAULT_SETTINGS.ad_delay_seconds,
            ec_show_photo: DEFAULT_SETTINGS.ec_show_photo,
            ec_show_matricula: DEFAULT_SETTINGS.ec_show_matricula,
            ec_show_position: DEFAULT_SETTINGS.ec_show_position,
            ec_show_department: DEFAULT_SETTINGS.ec_show_department,
            ec_show_punctuality: DEFAULT_SETTINGS.ec_show_punctuality,
            ec_show_graph: DEFAULT_SETTINGS.ec_show_graph,
            ec_show_stats: DEFAULT_SETTINGS.ec_show_stats,
            ec_show_vacation_holidays: DEFAULT_SETTINGS.ec_show_vacation_holidays,
            ec_show_records_list: DEFAULT_SETTINGS.ec_show_records_list,
            ec_records_limit: DEFAULT_SETTINGS.ec_records_limit,
            ec_custom_title: DEFAULT_SETTINGS.ec_custom_title,
            ec_custom_subtitle: DEFAULT_SETTINGS.ec_custom_subtitle
          };
        }
        
        return result.rows[0];
      },
      CACHE_TTL.SETTINGS
    );
    
    res.json(settings);
  } catch (error) {
    logger.error('Erro ao buscar configurações do EmployeeCheck', error);
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Atualizar configurações (apenas admin)
router.put('/', authenticateToken, isAdmin, async (req, res) => {
  // Invalidar todos os caches de settings
  cache.invalidate(CACHE_KEYS.SETTINGS);
  cache.invalidate('settings:public');
  cache.invalidate('settings:employee-check');

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
    require_geolocation,
    require_photo,
    enable_notifications,
    enable_email_notifications,
    auto_backup_enabled,
    backup_frequency_days,
    // Campos de propaganda
    ad_enabled,
    ad_title,
    ad_subtitle,
    ad_image_url,
    ad_bg_color_from,
    ad_bg_color_to,
    ad_delay_seconds,
    // Campos do EmployeeCheck
    ec_show_photo,
    ec_show_matricula,
    ec_show_position,
    ec_show_department,
    ec_show_punctuality,
    ec_show_graph,
    ec_show_stats,
    ec_show_vacation_holidays,
    ec_show_records_list,
    ec_records_limit,
    ec_custom_title,
    ec_custom_subtitle
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
          enable_facial_recognition, enable_qr_scanner, require_geolocation, require_photo,
          enable_notifications, enable_email_notifications,
          auto_backup_enabled, backup_frequency_days,
          ad_enabled, ad_title, ad_subtitle, ad_image_url,
          ad_bg_color_from, ad_bg_color_to, ad_delay_seconds,
          ec_show_photo, ec_show_matricula, ec_show_position, ec_show_department,
          ec_show_punctuality, ec_show_graph, ec_show_stats, ec_show_vacation_holidays,
          ec_show_records_list, ec_records_limit, ec_custom_title, ec_custom_subtitle
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41) RETURNING *`,
        [
          system_name, primary_color, logo_url, icon_url,
          company_name, company_address, company_phone, company_email,
          timezone, date_format, time_format, language,
          attendance_tolerance_minutes, max_daily_hours,
          enable_facial_recognition, enable_qr_scanner, require_geolocation ?? false, require_photo,
          enable_notifications, enable_email_notifications,
          auto_backup_enabled, backup_frequency_days,
          ad_enabled ?? true, ad_title ?? '', ad_subtitle ?? '',
          ad_image_url ?? '', ad_bg_color_from ?? '#15803d',
          ad_bg_color_to ?? '#16a34a', ad_delay_seconds ?? 3,
          ec_show_photo ?? true, ec_show_matricula ?? true,
          ec_show_position ?? true, ec_show_department ?? true,
          ec_show_punctuality ?? true, ec_show_graph ?? true,
          ec_show_stats ?? true, ec_show_vacation_holidays ?? true,
          ec_show_records_list ?? true, ec_records_limit ?? 10,
          ec_custom_title ?? 'Consulta de Frequência',
          ec_custom_subtitle ?? 'Digite seu CPF para verificar seus registros de ponto'
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
          require_geolocation = $17,
          require_photo = $18,
          enable_notifications = $19,
          enable_email_notifications = $20,
          auto_backup_enabled = $21,
          backup_frequency_days = $22,
          ad_enabled = $23,
          ad_title = $24,
          ad_subtitle = $25,
          ad_image_url = $26,
          ad_bg_color_from = $27,
          ad_bg_color_to = $28,
          ad_delay_seconds = $29,
          ec_show_photo = $30,
          ec_show_matricula = $31,
          ec_show_position = $32,
          ec_show_department = $33,
          ec_show_punctuality = $34,
          ec_show_graph = $35,
          ec_show_stats = $36,
          ec_show_vacation_holidays = $37,
          ec_show_records_list = $38,
          ec_records_limit = $39,
          ec_custom_title = $40,
          ec_custom_subtitle = $41,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $42 RETURNING *`,
        [
          system_name, primary_color, logo_url, icon_url,
          company_name, company_address, company_phone, company_email,
          timezone, date_format, time_format, language,
          attendance_tolerance_minutes, max_daily_hours,
          enable_facial_recognition, enable_qr_scanner, require_geolocation ?? false, require_photo,
          enable_notifications, enable_email_notifications,
          auto_backup_enabled, backup_frequency_days,
          ad_enabled ?? true, ad_title ?? '', ad_subtitle ?? '',
          ad_image_url ?? '', ad_bg_color_from ?? '#15803d',
          ad_bg_color_to ?? '#16a34a', ad_delay_seconds ?? 3,
          ec_show_photo ?? true, ec_show_matricula ?? true,
          ec_show_position ?? true, ec_show_department ?? true,
          ec_show_punctuality ?? true, ec_show_graph ?? true,
          ec_show_stats ?? true, ec_show_vacation_holidays ?? true,
          ec_show_records_list ?? true, ec_records_limit ?? 10,
          ec_custom_title ?? 'Consulta de Frequência',
          ec_custom_subtitle ?? 'Digite seu CPF para verificar seus registros de ponto',
          existing.rows[0].id
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao atualizar configurações', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

export default router;
