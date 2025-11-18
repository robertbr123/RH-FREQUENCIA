import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import organizationRoutes from './routes/organization.js';
import employeeCardRoutes from './routes/employee-card.js';
import usersRoutes from './routes/users.js';
import settingsRoutes from './routes/settings.js';
import migrateHolidaysRoutes from './routes/migrate-holidays.js';
import absencesRoutes from './routes/absences.js';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log de requisições em produção
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Initialize database once
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
      console.log('✅ Database initialized');
    } catch (err) {
      console.error('❌ Erro ao inicializar banco de dados:', err);
      throw err;
    }
  }
};

// Initialize on first request
app.use(async (req, res, next) => {
  await initDB();
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/employee-card', employeeCardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/migrate-holidays', migrateHolidaysRoutes);
app.use('/api/absences', absencesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Sistema de RH - Frequência',
    timestamp: new Date().toISOString(),
    dbInitialized
  });
});

// Initialize database endpoint (manual trigger)
app.post('/api/init-db', async (req, res) => {
  try {
    await initDatabase();
    dbInitialized = true;
    res.json({ 
      success: true, 
      message: 'Banco de dados inicializado com sucesso!' 
    });
  } catch (error) {
    console.error('Erro ao inicializar banco:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Migrate database endpoint
app.post('/api/migrate', async (req, res) => {
  try {
    const pool = (await import('./database.js')).default;
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Adicionar tabela de unidades
      await client.query(`
        CREATE TABLE IF NOT EXISTS units (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Adicionar colunas na tabela employees
      const employeeColumns = [
        'rg VARCHAR(20)',
        'birth_date DATE',
        'gender VARCHAR(20)',
        'marital_status VARCHAR(50)',
        'address TEXT',
        'city VARCHAR(100)',
        'state VARCHAR(2)',
        'zip_code VARCHAR(10)',
        'emergency_contact VARCHAR(255)',
        'emergency_phone VARCHAR(20)',
        'position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL',
        'department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL',
        'sector_id INTEGER REFERENCES sectors(id) ON DELETE SET NULL',
        'schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL',
        'unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL',
        'salary DECIMAL(10,2)',
        'bank_name VARCHAR(100)',
        'bank_account VARCHAR(50)',
        'pis VARCHAR(20)',
        'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
      ];

      // Adicionar colunas na tabela users
      const userColumns = [
        'email VARCHAR(255) UNIQUE',
        'status VARCHAR(20) DEFAULT \'active\''
      ];

      for (const column of employeeColumns) {
        try {
          await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS ${column}`);
        } catch (err) {
          // Coluna já existe
        }
      }

      for (const column of userColumns) {
        try {
          await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${column}`);
        } catch (err) {
          // Coluna já existe
        }
      }

      // Remover colunas antigas
      try {
        await client.query(`ALTER TABLE employees DROP COLUMN IF EXISTS position`);
        await client.query(`ALTER TABLE employees DROP COLUMN IF EXISTS department`);
      } catch (err) {
        // Já removidas
      }

      await client.query('COMMIT');
      client.release();
      
      res.json({ success: true, message: 'Migração concluída com sucesso!' });
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Erro na migração:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API Sistema RH',
    endpoints: ['/api/auth', '/api/employees', '/api/attendance', '/api/init-db']
  });
});

// Migração para sistema de múltiplos pontos
app.post('/api/migrate-attendance-punches', async (req, res) => {
  try {
    const pool = (await import('./database.js')).default;
    
    console.log('🔄 Executando migração de attendance_punches...');
    
    // SQL da migração inline (não depende de arquivo)
    const migrationSQL = `
      -- Criar nova tabela para registros de ponto
      CREATE TABLE IF NOT EXISTS attendance_punches (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        punch_time TIMESTAMP NOT NULL,
        punch_type VARCHAR(20) NOT NULL CHECK (punch_type IN ('entry', 'break_start', 'break_end', 'exit')),
        schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_punch_per_type UNIQUE (employee_id, date, punch_type)
      );

      -- Criar índices
      CREATE INDEX IF NOT EXISTS idx_attendance_punches_employee ON attendance_punches(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_punches_date ON attendance_punches(date);
      CREATE INDEX IF NOT EXISTS idx_attendance_punches_employee_date ON attendance_punches(employee_id, date);

      -- Migrar dados antigos da tabela attendance para attendance_punches
      INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type, schedule_id)
      SELECT 
        employee_id,
        DATE(check_in) as date,
        check_in as punch_time,
        'entry' as punch_type,
        NULL as schedule_id
      FROM attendance
      WHERE check_in IS NOT NULL
      ON CONFLICT (employee_id, date, punch_type) DO NOTHING;

      INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type, schedule_id)
      SELECT 
        employee_id,
        DATE(check_in) as date,
        check_out as punch_time,
        'exit' as punch_type,
        NULL as schedule_id
      FROM attendance
      WHERE check_out IS NOT NULL
      ON CONFLICT (employee_id, date, punch_type) DO NOTHING;

      -- Criar view para consolidação diária
      CREATE OR REPLACE VIEW attendance_daily AS
      SELECT 
        employee_id,
        date,
        MAX(CASE WHEN punch_type = 'entry' THEN punch_time END) as entry_time,
        MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) as break_start_time,
        MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) as break_end_time,
        MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) as exit_time,
        -- Calcular horas trabalhadas
        CASE 
          WHEN MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) IS NOT NULL 
               AND MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END) IS NOT NULL
               AND MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) IS NOT NULL THEN
            -- Com intervalo: (break_start - entry) + (exit - break_end)
            EXTRACT(EPOCH FROM (
              (MAX(CASE WHEN punch_type = 'break_start' THEN punch_time END) - MAX(CASE WHEN punch_type = 'entry' THEN punch_time END)) +
              (MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) - MAX(CASE WHEN punch_type = 'break_end' THEN punch_time END))
            )) / 3600
          WHEN MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) IS NOT NULL THEN
            -- Sem intervalo: exit - entry
            EXTRACT(EPOCH FROM (
              MAX(CASE WHEN punch_type = 'exit' THEN punch_time END) - MAX(CASE WHEN punch_type = 'entry' THEN punch_time END)
            )) / 3600
          ELSE NULL
        END as total_hours
      FROM attendance_punches
      GROUP BY employee_id, date;
    `;
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migração concluída com sucesso!');
    
    res.json({ 
      success: true, 
      message: 'Sistema de múltiplos pontos ativado com sucesso!' 
    });
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack
    });
  }
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  
  // Erro de validação do JWT
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ 
      error: 'Token inválido ou expirado',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  // Erro do PostgreSQL
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({ 
      error: 'Erro de validação no banco de dados',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  // Erro genérico
  res.status(err.status || 500).json({ 
    error: err.message || 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Handler para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Rota não encontrada',
    path: req.path 
  });
});

// Export for Vercel
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
  });
}
