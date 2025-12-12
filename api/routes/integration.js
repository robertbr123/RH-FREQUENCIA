import express from 'express';
import pool from '../database.js';
import logger from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';
import { authenticatePortalToken } from './employeePortal.js';
import axios from 'axios';

const router = express.Router();

// URL base do Check-IN (configurável via env)
const CHECKIN_API_URL = process.env.CHECKIN_API_URL || 'http://localhost:3000/api';
const CHECKIN_API_KEY = process.env.CHECKIN_API_KEY || '';
const INTEGRATION_API_KEY = process.env.INTEGRATION_API_KEY || '';

// ==========================================
// ENDPOINTS PARA O CHECK-IN CONSUMIR
// ==========================================

/**
 * GET /api/integration/employees
 * Buscar funcionários para o Check-IN
 * Query: search (nome ou CPF)
 * Auth: API Key via header Authorization
 */
router.get('/employees', async (req, res) => {
  try {
    // Validar API Key
    const authHeader = req.headers['authorization'];
    const apiKey = authHeader && authHeader.split(' ')[1];
    
    if (INTEGRATION_API_KEY && apiKey !== INTEGRATION_API_KEY) {
      return res.status(401).json({ error: 'API Key inválida' });
    }

    const { search } = req.query;
    
    let query = `
      SELECT 
        e.id,
        e.name,
        e.cpf,
        e.email,
        e.phone,
        d.name as department,
        p.name as position,
        u.name as unit,
        e.photo_url
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN units u ON e.unit_id = u.id
      WHERE e.status = 'active'
    `;
    
    const params = [];
    
    if (search) {
      const cleanSearch = search.replace(/\D/g, '');
      if (cleanSearch.length >= 11) {
        // Busca por CPF
        query += ` AND REGEXP_REPLACE(e.cpf, '[^0-9]', '', 'g') LIKE $1`;
        params.push(`%${cleanSearch}%`);
      } else {
        // Busca por nome
        query += ` AND e.name ILIKE $1`;
        params.push(`%${search}%`);
      }
    }
    
    query += ` ORDER BY e.name LIMIT 50`;
    
    const result = await pool.query(query, params);
    
    res.json(result.rows.map(emp => ({
      id: emp.id,
      name: emp.name,
      cpf: emp.cpf.replace(/\D/g, ''), // Retorna CPF limpo
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      unit: emp.unit,
      photoUrl: emp.photo_url
    })));
  } catch (error) {
    logger.error('Erro ao buscar funcionários para integração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /api/integration/employees/:id
 * Buscar funcionário específico por ID
 * Auth: API Key via header Authorization
 */
router.get('/employees/:id', async (req, res) => {
  try {
    // Validar API Key
    const authHeader = req.headers['authorization'];
    const apiKey = authHeader && authHeader.split(' ')[1];
    
    if (INTEGRATION_API_KEY && apiKey !== INTEGRATION_API_KEY) {
      return res.status(401).json({ error: 'API Key inválida' });
    }

    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        e.id,
        e.name,
        e.cpf,
        e.email,
        e.phone,
        d.name as department,
        p.name as position,
        u.name as unit,
        e.photo_url
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      LEFT JOIN units u ON e.unit_id = u.id
      WHERE e.id = $1 AND e.status = 'active'
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    
    const emp = result.rows[0];
    res.json({
      id: emp.id,
      name: emp.name,
      cpf: emp.cpf.replace(/\D/g, ''), // Retorna CPF limpo
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      unit: emp.unit,
      photoUrl: emp.photo_url
    });
  } catch (error) {
    logger.error('Erro ao buscar funcionário para integração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==========================================
// ENDPOINTS PARA O PORTAL DO FUNCIONÁRIO
// ==========================================

/**
 * GET /api/integration/checkin/events
 * Buscar eventos e QR codes do funcionário logado no Check-IN
 * Auth: Token do Portal do Funcionário
 */
router.get('/checkin/events', authenticatePortalToken, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    
    // Buscar CPF do funcionário
    const empResult = await pool.query(
      'SELECT cpf FROM employees WHERE id = $1',
      [employeeId]
    );
    
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    
    const cpf = empResult.rows[0].cpf.replace(/\D/g, '');
    
    // Buscar eventos no Check-IN
    const response = await axios.get(`${CHECKIN_API_URL}/integration/rhf/events`, {
      params: { cpf },
      headers: {
        'Authorization': `Bearer ${CHECKIN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        logger.warn('Check-IN não está disponível');
        return res.json({ events: [], message: 'Sistema de eventos não disponível' });
      }
      if (error.response?.status === 404) {
        return res.json({ events: [], message: 'Nenhum evento encontrado' });
      }
    }
    logger.error('Erro ao buscar eventos do Check-IN:', error);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

// ==========================================
// ADMIN: SINCRONIZAÇÃO COM CHECK-IN
// ==========================================

/**
 * POST /api/integration/checkin/sync-employee
 * Sincronizar funcionário com o Check-IN (criar/atualizar participante)
 * Body: { employeeId, eventId }
 * Auth: Token admin
 */
router.post('/checkin/sync-employee', authenticateToken, async (req, res) => {
  try {
    const { employeeId, eventId } = req.body;
    
    if (!employeeId || !eventId) {
      return res.status(400).json({ error: 'employeeId e eventId são obrigatórios' });
    }
    
    // Buscar dados do funcionário
    const empResult = await pool.query(`
      SELECT 
        e.id, e.name, e.cpf, e.email, e.phone,
        d.name as department, p.name as position
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE e.id = $1 AND e.status = 'active'
    `, [employeeId]);
    
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Funcionário não encontrado' });
    }
    
    const emp = empResult.rows[0];
    
    // Enviar para o Check-IN
    const response = await axios.post(`${CHECKIN_API_URL}/integration/rhf`, {
      employeeId: emp.id,
      eventId
    }, {
      headers: {
        'Authorization': `Bearer ${CHECKIN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ error: 'Sistema Check-IN não disponível' });
      }
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
    }
    logger.error('Erro ao sincronizar com Check-IN:', error);
    res.status(500).json({ error: 'Erro ao sincronizar com Check-IN' });
  }
});

/**
 * GET /api/integration/checkin/available-events
 * Buscar eventos disponíveis no Check-IN
 * Auth: Token admin
 */
router.get('/checkin/available-events', authenticateToken, async (req, res) => {
  try {
    // Buscar eventos no Check-IN
    const response = await axios.get(`${CHECKIN_API_URL}/events`, {
      headers: {
        'Authorization': `Bearer ${CHECKIN_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ error: 'Sistema Check-IN não disponível' });
      }
    }
    logger.error('Erro ao buscar eventos do Check-IN:', error);
    res.status(500).json({ error: 'Erro ao buscar eventos' });
  }
});

export default router;
