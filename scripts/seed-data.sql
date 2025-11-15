-- Script de seed com dados de exemplo
-- Este script será executado após a inicialização do banco

-- Inserir usuário administrador padrão
-- Senha: admin123 (hash bcrypt)
INSERT INTO users (username, password, name, email, role, status)
VALUES 
  ('admin', '$2a$10$ygBAHJNwxvxdXS7.AGJkeekGKhLnaLVJXE2kq3pRzAcoezxX9jfaG', 'Administrador do Sistema', 'admin@empresa.com', 'admin', 'active'),
  ('gestor', '$2a$10$ygBAHJNwxvxdXS7.AGJkeekGKhLnaLVJXE2kq3pRzAcoezxX9jfaG', 'Gestor RH', 'gestor@empresa.com', 'gestor', 'active'),
  ('operador', '$2a$10$ygBAHJNwxvxdXS7.AGJkeekGKhLnaLVJXE2kq3pRzAcoezxX9jfaG', 'Operador de Ponto', 'operador@empresa.com', 'operador', 'active')
ON CONFLICT (username) DO NOTHING;

-- Inserir departamentos de exemplo
INSERT INTO departments (name, description)
VALUES 
  ('Recursos Humanos', 'Departamento de gestão de pessoas'),
  ('Tecnologia da Informação', 'Desenvolvimento e infraestrutura'),
  ('Financeiro', 'Gestão financeira e contabilidade'),
  ('Comercial', 'Vendas e relacionamento com clientes'),
  ('Operações', 'Operações e logística')
ON CONFLICT (name) DO NOTHING;

-- Inserir cargos de exemplo
INSERT INTO positions (name, description)
VALUES 
  ('Gerente', 'Posição de gerência'),
  ('Analista', 'Analista especializado'),
  ('Assistente', 'Assistente administrativo'),
  ('Desenvolvedor', 'Desenvolvedor de software'),
  ('Designer', 'Designer gráfico'),
  ('Contador', 'Profissional de contabilidade'),
  ('Vendedor', 'Profissional de vendas'),
  ('Operador', 'Operador logístico')
ON CONFLICT (name) DO NOTHING;

-- Inserir setores de exemplo
INSERT INTO sectors (name, description, department_id)
VALUES 
  ('Recrutamento', 'Recrutamento e seleção', (SELECT id FROM departments WHERE name = 'Recursos Humanos' LIMIT 1)),
  ('Treinamento', 'Desenvolvimento de pessoas', (SELECT id FROM departments WHERE name = 'Recursos Humanos' LIMIT 1)),
  ('Desenvolvimento', 'Desenvolvimento de sistemas', (SELECT id FROM departments WHERE name = 'Tecnologia da Informação' LIMIT 1)),
  ('Infraestrutura', 'Infraestrutura e suporte', (SELECT id FROM departments WHERE name = 'Tecnologia da Informação' LIMIT 1)),
  ('Contas a Pagar', 'Gestão de pagamentos', (SELECT id FROM departments WHERE name = 'Financeiro' LIMIT 1)),
  ('Contas a Receber', 'Gestão de recebimentos', (SELECT id FROM departments WHERE name = 'Financeiro' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Inserir unidades de exemplo
INSERT INTO units (name, description, address, city, state)
VALUES 
  ('Matriz', 'Unidade principal', 'Av. Principal, 1000', 'São Paulo', 'SP'),
  ('Filial Rio', 'Filial Rio de Janeiro', 'Rua das Flores, 500', 'Rio de Janeiro', 'RJ'),
  ('Filial BH', 'Filial Belo Horizonte', 'Av. Afonso Pena, 2000', 'Belo Horizonte', 'MG')
ON CONFLICT (name) DO NOTHING;

-- Inserir horários de exemplo
INSERT INTO schedules (name, start_time, end_time, break_start, break_end, workdays)
VALUES 
  ('Horário Comercial', '08:00:00', '18:00:00', '12:00:00', '13:00:00', '["1","2","3","4","5"]'),
  ('Horário Flexível', '09:00:00', '18:00:00', '12:30:00', '13:30:00', '["1","2","3","4","5"]'),
  ('Turno Manhã', '06:00:00', '14:00:00', '10:00:00', '10:15:00', '["1","2","3","4","5"]'),
  ('Turno Tarde', '14:00:00', '22:00:00', '18:00:00', '18:15:00', '["1","2","3","4","5"]'),
  ('Meio Período', '08:00:00', '12:00:00', NULL, NULL, '["1","2","3","4","5"]')
ON CONFLICT DO NOTHING;

-- Inserir funcionários de exemplo
INSERT INTO employees (
  name, email, cpf, rg, birth_date, gender, marital_status,
  address, city, state, zip_code, phone,
  emergency_contact, emergency_phone,
  position_id, department_id, sector_id, schedule_id, unit_id,
  status, hire_date, salary
)
VALUES 
  (
    'João Silva Santos',
    'joao.silva@empresa.com',
    '123.456.789-00',
    '12.345.678-9',
    '1990-05-15',
    'Masculino',
    'Solteiro',
    'Rua das Flores, 123',
    'São Paulo',
    'SP',
    '01234-567',
    '(11) 98765-4321',
    'Maria Silva',
    '(11) 91234-5678',
    (SELECT id FROM positions WHERE name = 'Desenvolvedor' LIMIT 1),
    (SELECT id FROM departments WHERE name = 'Tecnologia da Informação' LIMIT 1),
    (SELECT id FROM sectors WHERE name = 'Desenvolvimento' LIMIT 1),
    (SELECT id FROM schedules WHERE name = 'Horário Flexível' LIMIT 1),
    (SELECT id FROM units WHERE name = 'Matriz' LIMIT 1),
    'active',
    '2024-01-15',
    5500.00
  ),
  (
    'Maria Santos Oliveira',
    'maria.santos@empresa.com',
    '987.654.321-00',
    '98.765.432-1',
    '1985-08-20',
    'Feminino',
    'Casada',
    'Av. Paulista, 1000',
    'São Paulo',
    'SP',
    '01310-100',
    '(11) 99876-5432',
    'José Santos',
    '(11) 92345-6789',
    (SELECT id FROM positions WHERE name = 'Gerente' LIMIT 1),
    (SELECT id FROM departments WHERE name = 'Recursos Humanos' LIMIT 1),
    (SELECT id FROM sectors WHERE name = 'Recrutamento' LIMIT 1),
    (SELECT id FROM schedules WHERE name = 'Horário Comercial' LIMIT 1),
    (SELECT id FROM units WHERE name = 'Matriz' LIMIT 1),
    'active',
    '2024-02-01',
    7800.00
  ),
  (
    'Pedro Oliveira Costa',
    'pedro.oliveira@empresa.com',
    '456.789.123-00',
    '45.678.912-3',
    '1992-11-10',
    'Masculino',
    'Divorciado',
    'Rua dos Pinheiros, 456',
    'Rio de Janeiro',
    'RJ',
    '22070-000',
    '(21) 98765-1234',
    'Ana Oliveira',
    '(21) 91234-8765',
    (SELECT id FROM positions WHERE name = 'Analista' LIMIT 1),
    (SELECT id FROM departments WHERE name = 'Financeiro' LIMIT 1),
    (SELECT id FROM sectors WHERE name = 'Contas a Pagar' LIMIT 1),
    (SELECT id FROM schedules WHERE name = 'Horário Comercial' LIMIT 1),
    (SELECT id FROM units WHERE name = 'Filial Rio' LIMIT 1),
    'active',
    '2024-03-10',
    4500.00
  ),
  (
    'Ana Costa Lima',
    'ana.costa@empresa.com',
    '789.123.456-00',
    '78.912.345-6',
    '1988-02-28',
    'Feminino',
    'Solteira',
    'Rua Augusta, 789',
    'São Paulo',
    'SP',
    '01305-000',
    '(11) 97654-3210',
    'Carlos Costa',
    '(11) 93456-7890',
    (SELECT id FROM positions WHERE name = 'Designer' LIMIT 1),
    (SELECT id FROM departments WHERE name = 'Comercial' LIMIT 1),
    NULL,
    (SELECT id FROM schedules WHERE name = 'Horário Flexível' LIMIT 1),
    (SELECT id FROM units WHERE name = 'Matriz' LIMIT 1),
    'active',
    '2024-04-05',
    4200.00
  ),
  (
    'Carlos Pereira Souza',
    'carlos.pereira@empresa.com',
    '321.654.987-00',
    '32.165.498-7',
    '1995-07-12',
    'Masculino',
    'Solteiro',
    'Av. Afonso Pena, 321',
    'Belo Horizonte',
    'MG',
    '30130-000',
    '(31) 98765-4321',
    'José Pereira',
    '(31) 91234-5678',
    (SELECT id FROM positions WHERE name = 'Vendedor' LIMIT 1),
    (SELECT id FROM departments WHERE name = 'Comercial' LIMIT 1),
    NULL,
    (SELECT id FROM schedules WHERE name = 'Horário Comercial' LIMIT 1),
    (SELECT id FROM units WHERE name = 'Filial BH' LIMIT 1),
    'active',
    '2024-05-20',
    3800.00
  ),
  (
    'Juliana Fernandes Alves',
    'juliana.fernandes@empresa.com',
    '654.321.987-00',
    '65.432.198-7',
    '1993-09-05',
    'Feminino',
    'Casada',
    'Rua das Acácias, 654',
    'São Paulo',
    'SP',
    '04567-890',
    '(11) 99988-7766',
    'Roberto Alves',
    '(11) 98877-6655',
    (SELECT id FROM positions WHERE name = 'Contador' LIMIT 1),
    (SELECT id FROM departments WHERE name = 'Financeiro' LIMIT 1),
    (SELECT id FROM sectors WHERE name = 'Contas a Receber' LIMIT 1),
    (SELECT id FROM schedules WHERE name = 'Horário Comercial' LIMIT 1),
    (SELECT id FROM units WHERE name = 'Matriz' LIMIT 1),
    'active',
    '2024-06-15',
    5200.00
  ),
  (
    'Roberto Almeida Santos',
    'roberto.almeida@empresa.com',
    '147.258.369-00',
    '14.725.836-9',
    '1987-12-25',
    'Masculino',
    'Casado',
    'Av. Brasil, 1470',
    'Rio de Janeiro',
    'RJ',
    '21000-000',
    '(21) 97766-5544',
    'Fernanda Almeida',
    '(21) 96655-4433',
    (SELECT id FROM positions WHERE name = 'Operador' LIMIT 1),
    (SELECT id FROM departments WHERE name = 'Operações' LIMIT 1),
    NULL,
    (SELECT id FROM schedules WHERE name = 'Turno Manhã' LIMIT 1),
    (SELECT id FROM units WHERE name = 'Filial Rio' LIMIT 1),
    'active',
    '2024-07-01',
    3200.00
  ),
  (
    'Fernanda Lima Rodrigues',
    'fernanda.lima@empresa.com',
    '258.369.147-00',
    '25.836.914-7',
    '1991-04-18',
    'Feminino',
    'Solteira',
    'Rua do Comércio, 258',
    'Belo Horizonte',
    'MG',
    '30140-000',
    '(31) 98877-6655',
    'Paulo Rodrigues',
    '(31) 97766-5544',
    (SELECT id FROM positions WHERE name = 'Assistente' LIMIT 1),
    (SELECT id FROM departments WHERE name = 'Recursos Humanos' LIMIT 1),
    (SELECT id FROM sectors WHERE name = 'Treinamento' LIMIT 1),
    (SELECT id FROM schedules WHERE name = 'Horário Comercial' LIMIT 1),
    (SELECT id FROM units WHERE name = 'Filial BH' LIMIT 1),
    'active',
    '2024-08-10',
    2800.00
  )
ON CONFLICT (email) DO NOTHING;

-- Inserir feriados nacionais de exemplo (2024/2025)
INSERT INTO holidays (name, date, type, recurring)
VALUES 
  ('Ano Novo', '2024-01-01', 'national', true),
  ('Carnaval', '2024-02-13', 'national', false),
  ('Sexta-feira Santa', '2024-03-29', 'national', false),
  ('Tiradentes', '2024-04-21', 'national', true),
  ('Dia do Trabalho', '2024-05-01', 'national', true),
  ('Corpus Christi', '2024-05-30', 'national', false),
  ('Independência do Brasil', '2024-09-07', 'national', true),
  ('Nossa Senhora Aparecida', '2024-10-12', 'national', true),
  ('Finados', '2024-11-02', 'national', true),
  ('Proclamação da República', '2024-11-15', 'national', true),
  ('Consciência Negra', '2024-11-20', 'national', true),
  ('Natal', '2024-12-25', 'national', true),
  -- 2025
  ('Ano Novo', '2025-01-01', 'national', true),
  ('Carnaval', '2025-03-04', 'national', false),
  ('Sexta-feira Santa', '2025-04-18', 'national', false),
  ('Tiradentes', '2025-04-21', 'national', true),
  ('Dia do Trabalho', '2025-05-01', 'national', true),
  ('Corpus Christi', '2025-06-19', 'national', false),
  ('Independência do Brasil', '2025-09-07', 'national', true),
  ('Nossa Senhora Aparecida', '2025-10-12', 'national', true),
  ('Finados', '2025-11-02', 'national', true),
  ('Proclamação da República', '2025-11-15', 'national', true),
  ('Consciência Negra', '2025-11-20', 'national', true),
  ('Natal', '2025-12-25', 'national', true)
ON CONFLICT DO NOTHING;

-- Inserir alguns registros de ponto de exemplo (últimos 7 dias)
DO $$
DECLARE
  emp RECORD;
  d DATE;
BEGIN
  -- Para cada funcionário ativo
  FOR emp IN SELECT id FROM employees WHERE status = 'active' LIMIT 3 LOOP
    -- Para os últimos 5 dias úteis
    FOR i IN 0..4 LOOP
      d := CURRENT_DATE - i;
      
      -- Pular fins de semana
      IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
        -- Entrada
        INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type)
        VALUES (
          emp.id,
          d,
          d + TIME '08:00:00' + (RANDOM() * INTERVAL '30 minutes'),
          'entry'
        )
        ON CONFLICT DO NOTHING;
        
        -- Saída para intervalo
        INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type)
        VALUES (
          emp.id,
          d,
          d + TIME '12:00:00' + (RANDOM() * INTERVAL '15 minutes'),
          'break_start'
        )
        ON CONFLICT DO NOTHING;
        
        -- Retorno do intervalo
        INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type)
        VALUES (
          emp.id,
          d,
          d + TIME '13:00:00' + (RANDOM() * INTERVAL '15 minutes'),
          'break_end'
        )
        ON CONFLICT DO NOTHING;
        
        -- Saída
        INSERT INTO attendance_punches (employee_id, date, punch_time, punch_type)
        VALUES (
          emp.id,
          d,
          d + TIME '18:00:00' + (RANDOM() * INTERVAL '30 minutes'),
          'exit'
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Dados de exemplo inseridos com sucesso!';
  RAISE NOTICE '👤 Usuários criados:';
  RAISE NOTICE '   - admin / admin123 (Administrador)';
  RAISE NOTICE '   - gestor / admin123 (Gestor)';
  RAISE NOTICE '   - operador / admin123 (Operador)';
  RAISE NOTICE '👥 8 funcionários de exemplo criados';
  RAISE NOTICE '🏢 5 departamentos criados';
  RAISE NOTICE '💼 8 cargos criados';
  RAISE NOTICE '🏭 3 unidades criadas';
  RAISE NOTICE '⏰ 5 horários criados';
  RAISE NOTICE '📅 Feriados 2024/2025 inseridos';
  RAISE NOTICE '🕐 Registros de ponto de exemplo dos últimos 5 dias';
END $$;
