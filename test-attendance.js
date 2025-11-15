// Script de teste para verificar registros de attendance
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testAttendance() {
  try {
    console.log('🔍 Verificando registros de attendance...\n');

    // 1. Contar total de registros
    const countResult = await pool.query('SELECT COUNT(*) FROM attendance');
    console.log(`📊 Total de registros na tabela attendance: ${countResult.rows[0].count}\n`);

    // 2. Buscar últimos 10 registros
    const recentResult = await pool.query(`
      SELECT a.*, e.name as employee_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      ORDER BY a.check_in DESC
      LIMIT 10
    `);

    if (recentResult.rows.length > 0) {
      console.log('📋 Últimos 10 registros:\n');
      recentResult.rows.forEach((record, index) => {
        console.log(`${index + 1}. Funcionário: ${record.employee_name || 'Desconhecido'} (ID: ${record.employee_id})`);
        console.log(`   Entrada: ${record.check_in}`);
        console.log(`   Saída: ${record.check_out || 'Não registrada'}`);
        console.log(`   Status: ${record.status}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Nenhum registro encontrado!\n');
    }

    // 3. Verificar registros de hoje
    const todayResult = await pool.query(`
      SELECT a.*, e.name as employee_name
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.id
      WHERE DATE(a.check_in) = CURRENT_DATE
      ORDER BY a.check_in DESC
    `);

    console.log(`📅 Registros de hoje: ${todayResult.rows.length}\n`);
    if (todayResult.rows.length > 0) {
      todayResult.rows.forEach((record, index) => {
        console.log(`${index + 1}. ${record.employee_name || 'Desconhecido'}: Entrada ${new Date(record.check_in).toLocaleTimeString('pt-BR')} ${record.check_out ? `| Saída ${new Date(record.check_out).toLocaleTimeString('pt-BR')}` : '| Sem saída'}`);
      });
      console.log('');
    }

    // 4. Verificar estrutura da tabela
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendance'
      ORDER BY ordinal_position
    `);

    console.log('🏗️  Estrutura da tabela attendance:\n');
    structureResult.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(obrigatório)' : '(opcional)'}`);
    });
    console.log('');

    // 5. Verificar se há funcionários ativos
    const employeesResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status = 'active' THEN 1 END) as active
      FROM employees
    `);

    console.log('👥 Funcionários:');
    console.log(`   Total: ${employeesResult.rows[0].total}`);
    console.log(`   Ativos: ${employeesResult.rows[0].active}\n`);

  } catch (error) {
    console.error('❌ Erro ao testar attendance:', error.message);
    console.error(error);
  } finally {
    await pool.end();
    console.log('✅ Teste concluído!');
  }
}

testAttendance();
