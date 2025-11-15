#!/bin/bash
# Script para iniciar o sistema em produção

set -e

echo "🐳 Iniciando Sistema RH - Frequência (Produção)"
echo "================================================"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado. Por favor, instale: https://docs.docker.com/get-docker/"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado. Por favor, instale: https://docs.docker.com/compose/install/"
    exit 1
fi

# Criar .env se não existir
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env a partir do exemplo..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Edite o arquivo .env e configure as senhas e JWT_SECRET antes de usar em produção!"
fi

# Build e start
echo "🔨 Construindo imagens Docker..."
docker-compose build

echo "🚀 Iniciando containers..."
docker-compose up -d

echo ""
echo "✅ Sistema iniciado com sucesso!"
echo ""
echo "📊 Verificando status dos containers..."
docker-compose ps

echo ""
echo "🌐 Acesse a aplicação:"
echo "   Frontend: http://localhost"
echo "   API: http://localhost:3001/api/health"
echo ""
echo "👤 Credenciais padrão:"
echo "   Usuário: admin"
echo "   Senha: admin123"
echo ""
echo "📝 Comandos úteis:"
echo "   Ver logs: docker-compose logs -f"
echo "   Parar: docker-compose stop"
echo "   Reiniciar: docker-compose restart"
echo ""
echo "⚠️  Lembre-se de trocar as senhas padrão em produção!"
