#!/bin/bash
# Script para restaurar backup do banco de dados

set -e

BACKUP_DIR="./backups"

echo "♻️  Restaurar Backup do Banco de Dados"
echo "======================================"

# Verificar se há backups
if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR 2>/dev/null)" ]; then
    echo "❌ Nenhum backup encontrado no diretório $BACKUP_DIR"
    exit 1
fi

# Listar backups disponíveis
echo "📂 Backups disponíveis:"
echo ""
select BACKUP in $BACKUP_DIR/*.sql.gz $BACKUP_DIR/*.sql; do
    if [ -n "$BACKUP" ]; then
        break
    fi
done

if [ -z "$BACKUP" ]; then
    echo "❌ Nenhum backup selecionado"
    exit 1
fi

echo ""
echo "⚠️  ATENÇÃO: Esta ação irá SUBSTITUIR todos os dados atuais!"
echo "Backup selecionado: $BACKUP"
read -p "Deseja continuar? (sim/não): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    echo "❌ Restauração cancelada"
    exit 0
fi

# Verificar se container do banco está rodando
if ! docker-compose ps db | grep -q "Up"; then
    echo "❌ Container do banco de dados não está rodando!"
    echo "Execute: docker-compose up -d db"
    exit 1
fi

echo "🔄 Restaurando backup..."

# Verificar se o arquivo está comprimido
if [[ $BACKUP == *.gz ]]; then
    gunzip -c "$BACKUP" | docker-compose exec -T db psql -U rhf_user -d rhf_db
else
    cat "$BACKUP" | docker-compose exec -T db psql -U rhf_user -d rhf_db
fi

echo ""
echo "✅ Backup restaurado com sucesso!"
echo "🔄 Reiniciando API para aplicar mudanças..."
docker-compose restart api

echo ""
echo "✅ Processo concluído!"
