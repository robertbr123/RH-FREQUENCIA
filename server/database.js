import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, 'rhf.db'));

export const initDatabase = () => {
  db.serialize(() => {
    // Tabela de usuários (administradores)
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de funcionários
    db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        position TEXT NOT NULL,
        department TEXT NOT NULL,
        phone TEXT,
        photo_url TEXT,
        status TEXT DEFAULT 'active',
        hire_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de registros de frequência
    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        check_in DATETIME NOT NULL,
        check_out DATETIME,
        status TEXT DEFAULT 'present',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `);

    // Criar usuário admin padrão (senha: admin123)
    db.run(`
      INSERT OR IGNORE INTO users (username, password, name, role)
      VALUES ('admin', '$2a$10$rXKqF5YqN5YqN5YqN5YqNOK5YqN5YqN5YqN5YqN5YqN5YqN5YqN5Y', 'Administrador', 'admin')
    `);

    console.log('✅ Banco de dados inicializado');
  });
};

export default db;
