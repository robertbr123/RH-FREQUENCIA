const { Pool } = require('pg')
const fs = require('fs')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

const runMigration = async () => {
  try {
    const sql = fs.readFileSync('./migrations/add-absences.sql', 'utf8')
    await pool.query(sql)
    console.log('✅ Migração executada com sucesso!')
    console.log('   Tabela employee_absences criada')
  } catch (err) {
    console.error('❌ Erro ao executar migração:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
