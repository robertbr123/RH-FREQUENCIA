-- Migração: Sistema de Chat entre Usuários e Administradores
-- Data: 26/11/2025

-- Criar tabela de conversas/tickets
CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'open', -- open, answered, closed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de mensagens
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations 
    SET updated_at = CURRENT_TIMESTAMP,
        last_message_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar timestamp ao adicionar mensagem
DROP TRIGGER IF EXISTS update_conversation_on_message ON chat_messages;
CREATE TRIGGER update_conversation_on_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- Comentários
COMMENT ON TABLE chat_conversations IS 'Conversas/tickets entre usuários e administradores';
COMMENT ON TABLE chat_messages IS 'Mensagens das conversas';
COMMENT ON COLUMN chat_conversations.status IS 'Status: open (aguardando resposta), answered (respondido), closed (encerrado)';

-- Verificar criação
SELECT 'Tabelas de chat criadas com sucesso!' as status;

SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as colunas
FROM information_schema.tables t
WHERE table_name IN ('chat_conversations', 'chat_messages')
ORDER BY table_name;
