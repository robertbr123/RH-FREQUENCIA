#!/bin/bash
# Script para iniciar o sistema em modo desenvolvimento

set -e

echo "🛠️  Iniciando Sistema RH - Frequência (Desenvolvimento)"
echo "========================================================="

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Por favor, instale: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Por favor, instale: https://docs.docker.com/compose/install/"
    exit 1
fi

# Criar .env se não existir
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env a partir do exemplo..."
    cp .env.example .env
fi

# Build e start
echo "🔨 Construindo imagens Docker (modo desenvolvimento)..."
docker-compose -f docker-compose.dev.yml build

echo "🚀 Iniciando containers com hot-reload..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
echo "✅ Sistema iniciado em modo desenvolvimento!"
echo ""
echo "📊 Verificando status dos containers..."
docker-compose -f docker-compose.dev.yml ps

echo ""
echo "🌐 Acesse a aplicação:"
echo "   Frontend (Vite): http://localhost:5173"
echo "   API: http://localhost:3001/api/health"
echo "   Banco: localhost:5432"
echo ""
echo "👤 Credenciais padrão:"
echo "   Usuário: admin"
echo "   Senha: admin123"
echo ""
echo "📝 Comandos úteis:"
echo "   Ver logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "   Parar: docker-compose -f docker-compose.dev.yml stop"
echo "   Reiniciar: docker-compose -f docker-compose.dev.yml restart"
echo ""
echo "🔥 Hot-reload ativado! Edite os arquivos e veja as mudanças automaticamente."
