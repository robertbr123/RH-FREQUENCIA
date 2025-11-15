#!/bin/bash
# Script para parar todos os containers

set -e

echo "🛑 Parando Sistema RH - Frequência"
echo "===================================="

# Parar produção (se estiver rodando)
if docker-compose ps -q 2>/dev/null | grep -q .; then
    echo "Parando containers de produção..."
    docker-compose stop
fi

# Parar desenvolvimento (se estiver rodando)
if docker-compose -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
    echo "Parando containers de desenvolvimento..."
    docker-compose -f docker-compose.dev.yml stop
fi

echo ""
echo "✅ Todos os containers foram parados!"
echo ""
echo "💡 Para remover completamente (incluindo dados):"
echo "   docker-compose down -v"
