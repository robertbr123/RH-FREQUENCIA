#!/bin/bash
# Script de teste rápido do ambiente Docker

set -e

echo "🧪 Teste Rápido - Sistema RH Frequência"
echo "========================================="
echo ""

FAILED=0

test_command() {
    local cmd=$1
    local description=$2
    
    echo -n "✓ Testando: $description... "
    
    if eval "$cmd" &> /dev/null; then
        echo "✅ OK"
    else
        echo "❌ FALHOU"
        FAILED=$((FAILED + 1))
    fi
}

echo "📦 Verificando arquivos essenciais:"
test_command "[ -f docker-compose.yml ]" "docker-compose.yml existe"
test_command "[ -f docker-compose.dev.yml ]" "docker-compose.dev.yml existe"
test_command "[ -f Dockerfile.api ]" "Dockerfile.api existe"
test_command "[ -f Dockerfile.client ]" "Dockerfile.client existe"
test_command "[ -f nginx.conf ]" "nginx.conf existe"
test_command "[ -f .env.example ]" ".env.example existe"
test_command "[ -f scripts/init-db.sql ]" "Script de inicialização existe"
test_command "[ -f scripts/seed-data.sql ]" "Script de seed existe"

echo ""
echo "🔧 Verificando scripts:"
test_command "[ -x scripts/docker/start-prod.sh ]" "start-prod.sh é executável"
test_command "[ -x scripts/docker/start-dev.sh ]" "start-dev.sh é executável"
test_command "[ -x scripts/docker/stop.sh ]" "stop.sh é executável"
test_command "[ -x scripts/docker/backup.sh ]" "backup.sh é executável"
test_command "[ -x scripts/docker/restore.sh ]" "restore.sh é executável"
test_command "[ -x scripts/docker/logs.sh ]" "logs.sh é executável"
test_command "[ -x scripts/docker/clean.sh ]" "clean.sh é executável"
test_command "[ -x scripts/docker/health-check.sh ]" "health-check.sh é executável"

echo ""
echo "📝 Verificando sintaxe YAML:"
test_command "docker-compose config > /dev/null" "docker-compose.yml é válido"
test_command "docker-compose -f docker-compose.dev.yml config > /dev/null" "docker-compose.dev.yml é válido"

echo ""
echo "🐳 Verificando Docker:"
test_command "docker --version" "Docker instalado"
test_command "docker-compose --version" "Docker Compose instalado"

echo ""
echo "=================================="
if [ $FAILED -eq 0 ]; then
    echo "✅ Todos os testes passaram!"
    echo ""
    echo "💡 Próximos passos:"
    echo "   1. Copie .env.example para .env"
    echo "   2. Execute: make prod (ou ./scripts/docker/start-prod.sh)"
    echo "   3. Acesse: http://localhost"
    echo "   4. Login: admin / admin123"
    exit 0
else
    echo "❌ $FAILED teste(s) falharam"
    echo ""
    echo "💡 Verifique os erros acima e corrija antes de prosseguir"
    exit 1
fi
