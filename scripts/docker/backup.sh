#!/bin/bash
# Script para fazer backup do banco de dados

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/rhf_backup_$TIMESTAMP.sql"

echo "💾 Backup do Banco de Dados RH-Frequência"
echo "=========================================="

# Criar diretório de backups se não existir
mkdir -p "$BACKUP_DIR"

# Verificar se container do banco está rodando
if ! docker-compose ps db | grep -q "Up"; then
    echo "❌ Container do banco de dados não está rodando!"
    echo "Execute: docker-compose up -d db"
    exit 1
fi

echo "📦 Criando backup..."
docker-compose exec -T db pg_dump -U rhf_user rhf_db > "$BACKUP_FILE"

# Comprimir backup
echo "🗜️  Comprimindo backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="$BACKUP_FILE.gz"

# Calcular tamanho
SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

echo ""
echo "✅ Backup criado com sucesso!"
echo "   Arquivo: $BACKUP_FILE"
echo "   Tamanho: $SIZE"
echo ""
echo "💡 Para restaurar este backup:"
echo "   gunzip -c $BACKUP_FILE | docker-compose exec -T db psql -U rhf_user -d rhf_db"
echo ""

# Listar backups existentes
echo "📂 Backups disponíveis:"
ls -lh "$BACKUP_DIR"
