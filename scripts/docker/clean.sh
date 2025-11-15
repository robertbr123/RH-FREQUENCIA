#!/bin/bash
# Script para limpar e resetar todo o ambiente Docker

set -e

echo "🧹 Limpar e Resetar Ambiente Docker"
echo "===================================="
echo ""
echo "⚠️  ATENÇÃO: Esta ação irá:"
echo "   - Parar todos os containers"
echo "   - Remover todos os containers"
echo "   - Remover todos os volumes (DADOS SERÃO PERDIDOS!)"
echo "   - Remover imagens construídas"
echo ""
read -p "Deseja continuar? (sim/não): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
read -p "Tem certeza? Digite 'CONFIRMO' para prosseguir: " DOUBLE_CONFIRM

if [ "$DOUBLE_CONFIRM" != "CONFIRMO" ]; then
    echo "❌ Operação cancelada"
    exit 0
fi

echo ""
echo "🛑 Parando containers..."
docker-compose down 2>/dev/null || true
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

echo "🗑️  Removendo volumes..."
docker-compose down -v 2>/dev/null || true
docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true

echo "🗑️  Removendo imagens..."
docker rmi rhf-frequencia-api rhf-frequencia-client 2>/dev/null || true
docker rmi $(docker images -q 'rhf-frequencia*') 2>/dev/null || true

echo "🧹 Limpando recursos não utilizados..."
docker system prune -f

echo ""
echo "✅ Ambiente limpo com sucesso!"
echo ""
echo "💡 Para reconstruir e iniciar:"
echo "   ./scripts/docker/start-prod.sh"
echo "   ou"
echo "   ./scripts/docker/start-dev.sh"
