#!/bin/bash
# Script para ver logs dos containers

set -e

echo "📋 Logs do Sistema RH - Frequência"
echo "==================================="
echo ""
echo "Escolha o serviço:"
echo "1) Todos os serviços"
echo "2) API"
echo "3) Frontend (Client)"
echo "4) Banco de Dados"
echo "5) Apenas erros"
echo ""
read -p "Opção: " OPTION

case $OPTION in
    1)
        echo "📊 Logs de todos os serviços (Ctrl+C para sair)..."
        docker-compose logs -f --tail=100
        ;;
    2)
        echo "📊 Logs da API (Ctrl+C para sair)..."
        docker-compose logs -f --tail=100 api
        ;;
    3)
        echo "📊 Logs do Frontend (Ctrl+C para sair)..."
        docker-compose logs -f --tail=100 client
        ;;
    4)
        echo "📊 Logs do Banco de Dados (Ctrl+C para sair)..."
        docker-compose logs -f --tail=100 db
        ;;
    5)
        echo "🔍 Filtrando apenas erros..."
        docker-compose logs --tail=500 | grep -i error
        ;;
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac
