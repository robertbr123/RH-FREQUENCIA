import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import cache, { CACHE_TTL } from '../utils/cache.js';

const router = express.Router();

// Chave de cache para localizações
const LOCATIONS_CACHE_KEY = 'allowed_locations';

// Middleware para verificar se é admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }
  next();
};

// Buscar todas as localizações permitidas
router.get('/', authenticateToken, async (req, res) => {
  try {
    const locations = await cache.getOrFetch(
      LOCATIONS_CACHE_KEY,
      async () => {
        const result = await pool.query(`
          SELECT id, name, description, latitude, longitude, radius_meters, is_active, created_at, updated_at
          FROM allowed_locations
          ORDER BY name
        `);
        return result.rows;
      },
      CACHE_TTL.ORGANIZATION
    );
    res.json(locations);
  } catch (error) {
    logger.error('Erro ao buscar localizações', error);
    res.status(500).json({ error: 'Erro ao buscar localizações' });
  }
});

// Buscar localizações ativas (para validação no scanner)
router.get('/active', async (req, res) => {
  try {
    const locations = await cache.getOrFetch(
      `${LOCATIONS_CACHE_KEY}:active`,
      async () => {
        const result = await pool.query(`
          SELECT id, name, latitude, longitude, radius_meters
          FROM allowed_locations
          WHERE is_active = true
          ORDER BY name
        `);
        return result.rows;
      },
      CACHE_TTL.ORGANIZATION
    );
    res.json(locations);
  } catch (error) {
    logger.error('Erro ao buscar localizações ativas', error);
    res.status(500).json({ error: 'Erro ao buscar localizações' });
  }
});

// Criar nova localização
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { name, description, latitude, longitude, radius_meters, is_active } = req.body;

  // Validações
  if (!name || !latitude || !longitude) {
    return res.status(400).json({ error: 'Nome, latitude e longitude são obrigatórios' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radius = parseFloat(radius_meters) || 100;

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Latitude inválida (deve ser entre -90 e 90)' });
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Longitude inválida (deve ser entre -180 e 180)' });
  }

  if (radius < 10 || radius > 10000) {
    return res.status(400).json({ error: 'Raio deve ser entre 10 e 10000 metros' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO allowed_locations (name, description, latitude, longitude, radius_meters, is_active)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, description || null, lat, lng, radius, is_active !== false]
    );
    cache.invalidate(LOCATIONS_CACHE_KEY);
    cache.invalidate(`${LOCATIONS_CACHE_KEY}:active`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao criar localização', error);
    res.status(500).json({ error: 'Erro ao criar localização' });
  }
});

// Atualizar localização
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, latitude, longitude, radius_meters, is_active } = req.body;

  // Validações
  if (!name || !latitude || !longitude) {
    return res.status(400).json({ error: 'Nome, latitude e longitude são obrigatórios' });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const radius = parseFloat(radius_meters) || 100;

  if (isNaN(lat) || lat < -90 || lat > 90) {
    return res.status(400).json({ error: 'Latitude inválida' });
  }

  if (isNaN(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'Longitude inválida' });
  }

  if (radius < 10 || radius > 10000) {
    return res.status(400).json({ error: 'Raio deve ser entre 10 e 10000 metros' });
  }

  try {
    const result = await pool.query(
      `UPDATE allowed_locations 
       SET name = $1, description = $2, latitude = $3, longitude = $4, 
           radius_meters = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [name, description || null, lat, lng, radius, is_active !== false, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Localização não encontrada' });
    }

    cache.invalidate(LOCATIONS_CACHE_KEY);
    cache.invalidate(`${LOCATIONS_CACHE_KEY}:active`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao atualizar localização', error);
    res.status(500).json({ error: 'Erro ao atualizar localização' });
  }
});

// Deletar localização
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM allowed_locations WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Localização não encontrada' });
    }

    cache.invalidate(LOCATIONS_CACHE_KEY);
    cache.invalidate(`${LOCATIONS_CACHE_KEY}:active`);
    res.json({ message: 'Localização removida com sucesso' });
  } catch (error) {
    logger.error('Erro ao deletar localização', error);
    res.status(500).json({ error: 'Erro ao deletar localização' });
  }
});

// Toggle ativo/inativo
router.patch('/:id/toggle', authenticateToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE allowed_locations 
       SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Localização não encontrada' });
    }

    cache.invalidate(LOCATIONS_CACHE_KEY);
    cache.invalidate(`${LOCATIONS_CACHE_KEY}:active`);
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Erro ao alternar status', error);
    res.status(500).json({ error: 'Erro ao alternar status' });
  }
});

export default router;
