#!/bin/bash
# Script de verificação de saúde do sistema

set -e

echo "🏥 Health Check - Sistema RH Frequência"
echo "========================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_service() {
    local service=$1
    local url=$2
    local name=$3
    
    echo -n "Verificando $name... "
    
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ DOWN${NC}"
        return 1
    fi
}

check_docker() {
    echo -n "Verificando Docker... "
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✅ Instalado${NC}"
        return 0
    else
        echo -e "${RED}❌ Não instalado${NC}"
        return 1
    fi
}

check_container() {
    local container=$1
    local name=$2
    
    echo -n "Verificando container $name... "
    
    if docker-compose ps $container 2>/dev/null | grep -q "Up"; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Stopped${NC}"
        return 1
    fi
}

# Verificações
echo "📋 Pré-requisitos:"
check_docker

echo ""
echo "🐳 Containers:"
check_container "db" "PostgreSQL"
check_container "api" "API"
check_container "client" "Frontend"

echo ""
echo "🌐 Serviços HTTP:"
check_service "api" "http://localhost:3001/api/health" "API"
check_service "client" "http://localhost" "Frontend"

echo ""
echo "📊 Recursos:"
echo -n "Uso de memória: "
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | tail -n +2

echo ""
echo "💾 Volumes:"
docker volume ls | grep rhf

echo ""
echo "🔍 Status detalhado:"
docker-compose ps

echo ""
echo "✅ Health check concluído!"
