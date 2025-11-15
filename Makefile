.PHONY: help prod dev stop restart logs backup restore clean status shell-api shell-db

# Cores para output
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
WHITE  := $(shell tput -Txterm setaf 7)
RESET  := $(shell tput -Txterm sgr0)

help: ## Mostra esta ajuda
	@echo ''
	@echo '${GREEN}Sistema RH - Frequência - Docker${RESET}'
	@echo ''
	@echo 'Uso:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<comando>${RESET}'
	@echo ''
	@echo 'Comandos:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  ${YELLOW}%-15s${RESET} %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ''

prod: ## Iniciar em modo produção
	@echo "${GREEN}Iniciando em modo produção...${RESET}"
	@docker-compose up -d
	@echo "${GREEN}✅ Sistema iniciado em http://localhost${RESET}"

dev: ## Iniciar em modo desenvolvimento
	@echo "${GREEN}Iniciando em modo desenvolvimento...${RESET}"
	@docker-compose -f docker-compose.dev.yml up -d
	@echo "${GREEN}✅ Sistema iniciado em http://localhost:5173${RESET}"

stop: ## Parar todos os containers
	@echo "${YELLOW}Parando containers...${RESET}"
	@docker-compose stop 2>/dev/null || true
	@docker-compose -f docker-compose.dev.yml stop 2>/dev/null || true
	@echo "${GREEN}✅ Containers parados${RESET}"

down: ## Parar e remover containers
	@echo "${YELLOW}Parando e removendo containers...${RESET}"
	@docker-compose down 2>/dev/null || true
	@docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
	@echo "${GREEN}✅ Containers removidos${RESET}"

restart: stop prod ## Reiniciar em modo produção

logs: ## Ver logs de todos os serviços
	@docker-compose logs -f --tail=100

logs-api: ## Ver logs da API
	@docker-compose logs -f --tail=100 api

logs-client: ## Ver logs do Frontend
	@docker-compose logs -f --tail=100 client

logs-db: ## Ver logs do Banco
	@docker-compose logs -f --tail=100 db

status: ## Ver status dos containers
	@echo "${GREEN}Status dos containers:${RESET}"
	@docker-compose ps

backup: ## Fazer backup do banco de dados
	@./scripts/docker/backup.sh

restore: ## Restaurar backup do banco
	@./scripts/docker/restore.sh

clean: ## Limpar completamente o ambiente
	@./scripts/docker/clean.sh

rebuild: ## Reconstruir imagens
	@echo "${YELLOW}Reconstruindo imagens...${RESET}"
	@docker-compose build --no-cache
	@echo "${GREEN}✅ Imagens reconstruídas${RESET}"

shell-api: ## Acessar shell do container da API
	@docker-compose exec api sh

shell-db: ## Acessar shell do PostgreSQL
	@docker-compose exec db psql -U rhf_user -d rhf_db

shell-client: ## Acessar shell do container Frontend
	@docker-compose exec client sh

health: ## Verificar saúde dos serviços
	@echo "${GREEN}Verificando saúde dos serviços...${RESET}"
	@echo -n "API: "
	@curl -s http://localhost:3001/api/health | grep -q "ok" && echo "${GREEN}✅ OK${RESET}" || echo "${YELLOW}❌ DOWN${RESET}"
	@echo -n "Frontend: "
	@curl -s http://localhost >/dev/null && echo "${GREEN}✅ OK${RESET}" || echo "${YELLOW}❌ DOWN${RESET}"

install: ## Instalar dependências e configurar
	@echo "${GREEN}Configurando ambiente...${RESET}"
	@cp -n .env.example .env || true
	@echo "${GREEN}✅ Arquivo .env criado (edite conforme necessário)${RESET}"
	@chmod +x scripts/docker/*.sh
	@echo "${GREEN}✅ Scripts tornados executáveis${RESET}"
	@echo "${YELLOW}Execute 'make prod' ou 'make dev' para iniciar${RESET}"

update: ## Atualizar e reiniciar
	@echo "${YELLOW}Atualizando sistema...${RESET}"
	@git pull
	@docker-compose down
	@docker-compose build
	@docker-compose up -d
	@echo "${GREEN}✅ Sistema atualizado${RESET}"
