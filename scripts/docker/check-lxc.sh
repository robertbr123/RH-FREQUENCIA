#!/bin/bash

# Script de Verificação para Proxmox LXC
# Verifica se o ambiente está configurado corretamente para rodar o RH-FREQUENCIA

echo "=================================================="
echo "🔍 Verificação de Ambiente - Proxmox LXC"
echo "=================================================="
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Função para checar
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
        ((ERRORS++))
    fi
}

check_warning() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${YELLOW}⚠${NC} $1"
        ((WARNINGS++))
    fi
}

echo "📋 Verificando Sistema Operacional..."
cat /etc/os-release | grep -q "Ubuntu\|Debian" && check "Sistema: Ubuntu/Debian" || check "Sistema Operacional"
echo ""

echo "🐳 Verificando Docker..."
command -v docker >/dev/null 2>&1 && check "Docker instalado" || check "Docker instalado"
docker --version >/dev/null 2>&1 && check "Docker funcional" || check "Docker funcional"
docker compose version >/dev/null 2>&1 && check "Docker Compose instalado" || check "Docker Compose instalado"
docker ps >/dev/null 2>&1 && check "Docker daemon rodando" || check "Docker daemon rodando"
echo ""

echo "🔧 Verificando Configuração LXC..."
if [ -f "/proc/self/status" ]; then
    grep -q "0000003fffffffff" /proc/self/status && check_warning "Container com capabilities" || check_warning "Container capabilities limitadas"
fi

if [ -f "/proc/1/environ" ]; then
    strings /proc/1/environ | grep -q "container=lxc" && echo -e "${GREEN}✓${NC} Container LXC detectado" || echo -e "${YELLOW}⚠${NC} Container type não detectado"
fi
echo ""

echo "🌐 Verificando Rede..."
ping -c 1 google.com >/dev/null 2>&1 && check "Conectividade Internet" || check "Conectividade Internet"
curl -s https://api.github.com >/dev/null 2>&1 && check_warning "Acesso HTTPS GitHub" || check_warning "Acesso HTTPS GitHub"
echo ""

echo "💾 Verificando Recursos..."
TOTAL_MEM=$(free -m | grep Mem | awk '{print $2}')
if [ "$TOTAL_MEM" -ge 1024 ]; then
    echo -e "${GREEN}✓${NC} Memória: ${TOTAL_MEM}MB (OK)"
elif [ "$TOTAL_MEM" -ge 512 ]; then
    echo -e "${YELLOW}⚠${NC} Memória: ${TOTAL_MEM}MB (Mínimo, pode ser lento)"
    ((WARNINGS++))
else
    echo -e "${RED}✗${NC} Memória: ${TOTAL_MEM}MB (Insuficiente)"
    ((ERRORS++))
fi

CPU_CORES=$(nproc)
if [ "$CPU_CORES" -ge 2 ]; then
    echo -e "${GREEN}✓${NC} CPU: ${CPU_CORES} cores (OK)"
else
    echo -e "${YELLOW}⚠${NC} CPU: ${CPU_CORES} core (Mínimo)"
    ((WARNINGS++))
fi

DISK_FREE=$(df -BG / | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$DISK_FREE" -ge 10 ]; then
    echo -e "${GREEN}✓${NC} Disco livre: ${DISK_FREE}GB (OK)"
else
    echo -e "${RED}✗${NC} Disco livre: ${DISK_FREE}GB (Insuficiente, mínimo 10GB)"
    ((ERRORS++))
fi
echo ""

echo "📦 Verificando Portas..."
check_port() {
    PORT=$1
    NAME=$2
    if ! netstat -tuln 2>/dev/null | grep -q ":$PORT " && ! ss -tuln 2>/dev/null | grep -q ":$PORT "; then
        echo -e "${GREEN}✓${NC} Porta $PORT livre ($NAME)"
    else
        echo -e "${RED}✗${NC} Porta $PORT em uso ($NAME)"
        ((ERRORS++))
    fi
}

check_port 8080 "Frontend"
check_port 3001 "API"
check_port 5432 "PostgreSQL"
echo ""

echo "🔐 Verificando Privilégios..."
if [ "$EUID" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Rodando como root"
else
    echo -e "${YELLOW}⚠${NC} Não está como root (pode precisar de sudo)"
    ((WARNINGS++))
fi

# Verificar se usuário está no grupo docker
if groups | grep -q docker; then
    echo -e "${GREEN}✓${NC} Usuário no grupo docker"
else
    echo -e "${YELLOW}⚠${NC} Usuário não está no grupo docker (precisará usar sudo)"
    ((WARNINGS++))
fi
echo ""

echo "📁 Verificando Arquivos do Projeto..."
if [ -f "docker-compose.yml" ]; then
    echo -e "${GREEN}✓${NC} docker-compose.yml encontrado"
    
    # Verificar se usa porta 8080
    if grep -q "8080:8080" docker-compose.yml; then
        echo -e "${GREEN}✓${NC} Configurado para porta 8080 (compatível LXC)"
    else
        echo -e "${RED}✗${NC} Não está configurado para porta 8080"
        ((ERRORS++))
    fi
else
    echo -e "${RED}✗${NC} docker-compose.yml NÃO encontrado"
    ((ERRORS++))
fi

[ -f "Dockerfile.api" ] && check "Dockerfile.api encontrado" || check "Dockerfile.api encontrado"
[ -f "Dockerfile.client" ] && check "Dockerfile.client encontrado" || check "Dockerfile.client encontrado"
[ -f "scripts/init-db.sql" ] && check "Script de inicialização DB" || check "Script de inicialização DB"
echo ""

echo "🔍 Verificando Containers Docker..."
if docker ps -a | grep -q rhf-; then
    echo -e "${YELLOW}⚠${NC} Containers existentes encontrados:"
    docker ps -a --filter "name=rhf-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    echo -e "${YELLOW}Dica:${NC} Execute 'docker compose down' para limpar antes de iniciar"
else
    echo -e "${GREEN}✓${NC} Nenhum container anterior encontrado"
fi
echo ""

echo "=================================================="
echo "📊 Resumo da Verificação"
echo "=================================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ Tudo OK! Sistema pronto para rodar.${NC}"
    echo ""
    echo "Execute agora:"
    echo "  docker compose up -d"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS avisos encontrados, mas pode continuar.${NC}"
    echo ""
    echo "Execute agora:"
    echo "  docker compose up -d"
else
    echo -e "${RED}✗ $ERRORS erros encontrados!${NC}"
    [ $WARNINGS -gt 0 ] && echo -e "${YELLOW}⚠ $WARNINGS avisos encontrados.${NC}"
    echo ""
    echo "Corrija os erros antes de continuar."
    echo "Consulte: PROXMOX-LXC.md para ajuda"
fi
echo ""

# Exibir informações úteis
echo "=================================================="
echo "📝 Informações do Sistema"
echo "=================================================="
echo "Container: $(hostname)"
echo "IP: $(hostname -I | awk '{print $1}')"
echo "Memória: ${TOTAL_MEM}MB"
echo "CPU: ${CPU_CORES} core(s)"
echo "Disco livre: ${DISK_FREE}GB"
echo ""
echo "Após iniciar, acesse:"
echo "  http://$(hostname -I | awk '{print $1}'):8080"
echo ""
echo "Login padrão:"
echo "  Usuário: admin"
echo "  Senha: admin123"
echo "=================================================="

exit $ERRORS
