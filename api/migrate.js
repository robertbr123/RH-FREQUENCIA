import pool from './database.js';

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    console.log('🔄 Iniciando migração...');

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
    console.log('✅ Tabela units criada');

    // Adicionar colunas que podem estar faltando na tabela employees
    const columnsToAdd = [
      { name: 'rg', type: 'VARCHAR(20)' },
      { name: 'birth_date', type: 'DATE' },
      { name: 'gender', type: 'VARCHAR(20)' },
      { name: 'marital_status', type: 'VARCHAR(50)' },
      { name: 'address', type: 'TEXT' },
      { name: 'city', type: 'VARCHAR(100)' },
      { name: 'state', type: 'VARCHAR(2)' },
      { name: 'zip_code', type: 'VARCHAR(10)' },
      { name: 'emergency_contact', type: 'VARCHAR(255)' },
      { name: 'emergency_phone', type: 'VARCHAR(20)' },
      { name: 'position_id', type: 'INTEGER REFERENCES positions(id) ON DELETE SET NULL' },
      { name: 'department_id', type: 'INTEGER REFERENCES departments(id) ON DELETE SET NULL' },
      { name: 'sector_id', type: 'INTEGER REFERENCES sectors(id) ON DELETE SET NULL' },
      { name: 'schedule_id', type: 'INTEGER REFERENCES schedules(id) ON DELETE SET NULL' },
      { name: 'unit_id', type: 'INTEGER REFERENCES units(id) ON DELETE SET NULL' },
      { name: 'salary', type: 'DECIMAL(10,2)' },
      { name: 'bank_name', type: 'VARCHAR(100)' },
      { name: 'bank_account', type: 'VARCHAR(50)' },
      { name: 'pis', type: 'VARCHAR(20)' },
      { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const column of columnsToAdd) {
      try {
        await client.query(`
          ALTER TABLE employees 
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}
        `);
        console.log(`✅ Coluna ${column.name} adicionada/verificada`);
      } catch (err) {
        console.log(`⚠️  Coluna ${column.name} já existe ou erro: ${err.message}`);
      }
    }

    // Remover colunas antigas que não são mais usadas
    try {
      await client.query(`ALTER TABLE employees DROP COLUMN IF EXISTS position`);
      await client.query(`ALTER TABLE employees DROP COLUMN IF EXISTS department`);
      console.log('✅ Colunas antigas removidas');
    } catch (err) {
      console.log('⚠️  Colunas antigas já foram removidas');
    }

    await client.query('COMMIT');
    console.log('✅ Migração concluída com sucesso!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
