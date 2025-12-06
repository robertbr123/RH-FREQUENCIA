import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const { Pool } = pg;

// Configuração ULTRA otimizada para Vercel Serverless com Neon
// IMPORTANTE: Use a connection string do POOLER do Neon (porta 6543) ao invés da direta (5432)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Configurações MÍNIMAS para serverless - evitar "too many clients"
  max: 1, // Apenas 1 conexão por instância serverless
  min: 0, // Não manter conexões ociosas
  idleTimeoutMillis: 1000, // 1 segundo - libera IMEDIATAMENTE
  connectionTimeoutMillis: 10000, // 10 segundos para conectar
  allowExitOnIdle: true // Permite encerrar conexões idle em serverless
});

// Testar conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool de conexões:', err);
  // Tentar reconectar fechando conexões problemáticas
});

// Graceful shutdown para serverless
process.on('SIGTERM', async () => {
  console.log('Encerrando conexões do pool...');
  await pool.end();
});

// Helper para executar query com retry automático
export const queryWithRetry = async (text, params, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      if (error.code === '53300' && i < retries - 1) {
        // Too many clients - aguardar e tentar novamente
        console.log(`⚠️ Too many clients, retry ${i + 1}/${retries}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
};

// Cache para evitar múltiplas inicializações
let isInitialized = false;
let initPromise = null;

export const initDatabase = async () => {
  // Se já foi inicializado, retorna
  if (isInitialized) {
    return;
  }
  
  // Se já está inicializando, aguarda a promessa existente
  if (initPromise) {
    return initPromise;
  }
  
  initPromise = (async () => {
    const client = await pool.connect();
    
    try {
    await client.query('BEGIN');

    // Tabela de usuários (administradores, gestores, operadores)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        role VARCHAR(50) DEFAULT 'operador' CHECK (role IN ('admin', 'gestor', 'operador')),
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de cargos
    await client.query(`
      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de departamentos
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de setores
    await client.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de unidades
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

    // Tabela de configurações do sistema
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        system_name VARCHAR(255) DEFAULT 'RH System',
        primary_color VARCHAR(7) DEFAULT '#3b82f6',
        logo_url TEXT,
        icon_url TEXT,
        company_name VARCHAR(255),
        company_address TEXT,
        company_phone VARCHAR(20),
        company_email VARCHAR(255),
        timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
        date_format VARCHAR(20) DEFAULT 'dd/MM/yyyy',
        time_format VARCHAR(10) DEFAULT '24h',
        language VARCHAR(10) DEFAULT 'pt-BR',
        attendance_tolerance_minutes INTEGER DEFAULT 5,
        max_daily_hours INTEGER DEFAULT 12,
        enable_facial_recognition BOOLEAN DEFAULT true,
        enable_qr_scanner BOOLEAN DEFAULT true,
        require_photo BOOLEAN DEFAULT false,
        enable_notifications BOOLEAN DEFAULT true,
        enable_email_notifications BOOLEAN DEFAULT false,
        auto_backup_enabled BOOLEAN DEFAULT false,
        backup_frequency_days INTEGER DEFAULT 7,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de horários
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        break_start TIME,
        break_end TIME,
        workdays JSONB DEFAULT '["1","2","3","4","5"]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de funcionários (atualizada)
    await client.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        cpf VARCHAR(14) UNIQUE NOT NULL,
        rg VARCHAR(20),
        birth_date DATE,
        gender VARCHAR(20),
        marital_status VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(2),
        zip_code VARCHAR(10),
        phone VARCHAR(20),
        emergency_contact VARCHAR(255),
        emergency_phone VARCHAR(20),
        position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
        department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
        sector_id INTEGER REFERENCES sectors(id) ON DELETE SET NULL,
        schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
        unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
        photo_url TEXT,
        status VARCHAR(20) DEFAULT 'active',
        hire_date DATE NOT NULL,
        salary DECIMAL(10,2),
        bank_name VARCHAR(100),
        bank_account VARCHAR(50),
        pis VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de registros de frequência
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        check_in TIMESTAMP NOT NULL,
        check_out TIMESTAMP,
        status VARCHAR(20) DEFAULT 'present',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices para melhor performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_check_in ON attendance(check_in);
      CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    `);

    // Verificar se usuário admin existe
    const adminCheck = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    // Criar usuário admin padrão se não existir (senha: admin123)
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (username, password, name, role) VALUES ($1, $2, $3, $4)',
        ['admin', hashedPassword, 'Administrador', 'admin']
      );
      console.log('✅ Usuário admin criado (username: admin, senha: admin123)');
    }

    await client.query('COMMIT');
    console.log('✅ Banco de dados inicializado com sucesso');
    isInitialized = true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao inicializar banco de dados:', error);
    initPromise = null; // Reset para permitir retry
    throw error;
  } finally {
    client.release();
  }
  })();
  
  return initPromise;
};

export default pool;
