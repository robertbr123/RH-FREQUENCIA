-- Migração: Adicionar suporte a reconhecimento facial
-- Data: 26/11/2025

-- Adicionar coluna face_descriptor na tabela employees (se não existir)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS face_descriptor TEXT;

-- Garantir que photo_url existe (caso seja banco antigo)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Adicionar comentários explicativos
COMMENT ON COLUMN employees.face_descriptor IS 'Descritor facial em JSON (array de 128 valores) para reconhecimento biométrico';
COMMENT ON COLUMN employees.photo_url IS 'URL ou Base64 da foto do funcionário (usada para cadastro e exibição)';

-- Criar índice para melhorar performance em buscas de face
CREATE INDEX IF NOT EXISTS idx_employees_face_descriptor 
ON employees(id) 
WHERE face_descriptor IS NOT NULL;

-- Criar índice para funcionários com foto
CREATE INDEX IF NOT EXISTS idx_employees_with_photo
ON employees(id)
WHERE photo_url IS NOT NULL;

-- Mensagem de sucesso
SELECT 'Migração de reconhecimento facial concluída com sucesso!' as status;
