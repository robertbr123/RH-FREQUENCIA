# 🐳 Docker - Sistema RH Frequência

Guia completo para executar o **Sistema de RH - Controle de Frequência** usando Docker.

---

## 📋 Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) instalado (versão 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) instalado (versão 2.0+)
- Pelo menos 2GB de RAM disponível
- Portas disponíveis: `80`, `3001`, `5432` (ou `5173` para dev)

---

## 🚀 Quick Start (Produção)

### 1. Clone o repositório (se ainda não tiver)

```bash
git clone https://github.com/robertbr123/RH-FREQUENCIA.git
cd RH-FREQUENCIA
```

### 2. Configure as variáveis de ambiente (opcional)

```bash
cp .env.example .env
# Edite o arquivo .env e ajuste as credenciais (especialmente JWT_SECRET e senhas)
nano .env
```

### 3. Inicie os containers

```bash
docker-compose up -d
```

Isso irá:
- ✅ Baixar as imagens necessárias
- ✅ Criar o banco PostgreSQL com dados de exemplo
- ✅ Construir e iniciar a API
- ✅ Construir e iniciar o Frontend

### 4. Aguarde a inicialização (30-60 segundos)

```bash
docker-compose logs -f
# Pressione Ctrl+C para sair dos logs
```

### 5. Acesse a aplicação

- **Frontend:** http://localhost
- **API:** http://localhost:3001/api/health
- **Banco de dados:** `localhost:5432`

### 6. Faça login

Usuários de exemplo criados automaticamente:

| Usuário | Senha | Papel |
|---------|-------|-------|
| admin | admin123 | Administrador |
| gestor | admin123 | Gestor |
| operador | admin123 | Operador |

---

## 🛠️ Modo Desenvolvimento (com hot-reload)

Para desenvolvimento com atualização automática de código:

```bash
# Parar containers de produção (se estiverem rodando)
docker-compose down

# Iniciar em modo desenvolvimento
docker-compose -f docker-compose.dev.yml up -d
```

**Diferenças do modo dev:**
- ✅ Hot-reload no backend (nodemon)
- ✅ Hot-reload no frontend (Vite HMR)
- ✅ Código montado via volumes (edições refletem imediatamente)
- ✅ Frontend acessível em: http://localhost:5173
- ✅ Banco de dados separado: `rhf_db_dev`

### Acessar logs em tempo real (dev)

```bash
docker compose -f docker-compose.dev.yml logs -f
```

---

## 📦 Comandos Úteis

### Verificar status dos containers

```bash
docker-compose ps
```

### Ver logs de um serviço específico

```bash
docker-compose logs api        # Logs da API
docker-compose logs client     # Logs do Frontend
docker-compose logs db         # Logs do PostgreSQL
```

### Parar containers

```bash
docker-compose stop
```

### Parar e remover containers

```bash
docker-compose down
```

### Parar e remover containers + volumes (⚠️ apaga dados do banco)

```bash
docker-compose down -v
```

### Reconstruir imagens (após mudanças no código)

```bash
docker-compose build
docker-compose up -d
```

### Acessar shell do container

```bash
# API
docker-compose exec api sh

# Cliente
docker-compose exec client sh

# Banco de dados
docker-compose exec db psql -U rhf_user -d rhf_db
```

### Executar comandos SQL direto no banco

```bash
docker-compose exec db psql -U rhf_user -d rhf_db -c "SELECT * FROM users;"
```

### Backup do banco de dados

```bash
docker-compose exec db pg_dump -U rhf_user rhf_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar backup

```bash
cat backup.sql | docker-compose exec -T db psql -U rhf_user -d rhf_db
```

---

## 🏗️ Arquitetura Docker

```
┌─────────────────────────────────────────────┐
│           Docker Compose Network            │
│                                             │
│  ┌──────────────┐    ┌──────────────┐     │
│  │   Client     │    │     API      │     │
│  │  (Nginx)     │◄───│  (Node.js)   │     │
│  │  Port: 80    │    │  Port: 3001  │     │
│  └──────────────┘    └──────┬───────┘     │
│                              │              │
│                       ┌──────▼───────┐     │
│                       │  PostgreSQL  │     │
│                       │  Port: 5432  │     │
│                       └──────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
```

### Fluxo de requisições:

1. **Usuário** → `http://localhost` → **Nginx** (porta 80)
2. **Nginx** → `/api/*` → **API** (porta 3001)
3. **API** → **PostgreSQL** (porta 5432)

---

## 📊 Dados de Exemplo

O sistema é inicializado com:

- ✅ **3 usuários** (admin, gestor, operador)
- ✅ **8 funcionários** de exemplo
- ✅ **5 departamentos** (RH, TI, Financeiro, Comercial, Operações)
- ✅ **8 cargos** (Gerente, Analista, Desenvolvedor, etc.)
- ✅ **3 unidades** (Matriz SP, Filial RJ, Filial BH)
- ✅ **5 horários** (Comercial, Flexível, Turnos)
- ✅ **Feriados** nacionais 2024/2025
- ✅ **Registros de ponto** dos últimos 5 dias úteis

---

## 🔒 Segurança em Produção

### ⚠️ **IMPORTANTE:** Antes de fazer deploy em produção:

1. **Mude as senhas padrão:**
   ```bash
   # No arquivo .env
   POSTGRES_PASSWORD=SenhaForteAqui123!
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Restrinja o CORS:**
   ```javascript
   // Em api/index.js
   app.use(cors({
     origin: 'https://seudominio.com'
   }));
   ```

3. **Use HTTPS:**
   - Configure um proxy reverso (Nginx/Traefik)
   - Ou use Cloudflare/Let's Encrypt

4. **Configure backup automático:**
   ```bash
   # Cron job para backup diário
   0 2 * * * docker-compose exec db pg_dump -U rhf_user rhf_db | gzip > /backups/rhf_$(date +\%Y\%m\%d).sql.gz
   ```

5. **Limite acesso à porta do banco:**
   ```yaml
   # Em docker-compose.yml, remova a exposição da porta do DB:
   # ports:
   #   - "5432:5432"
   ```

6. **Atualize os usuários padrão:**
   - Após primeiro login, troque as senhas
   - Ou delete os usuários de exemplo e crie novos

---

## 🐛 Troubleshooting

### Erro: "port is already allocated"

```bash
# Verificar o que está usando a porta
sudo lsof -i :80   # ou :3001, :5432

# Parar serviço conflitante ou mudar porta em docker-compose.yml
```

### Erro: "Cannot connect to database"

```bash
# Verificar logs do banco
docker-compose logs db

# Verificar health do banco
docker-compose ps

# Reiniciar banco
docker-compose restart db
```

### Frontend não carrega/página em branco

```bash
# Verificar logs do nginx
docker-compose logs client

# Reconstruir o frontend
docker-compose build client
docker-compose up -d client
```

### API não responde

```bash
# Verificar logs
docker-compose logs api

# Verificar health
curl http://localhost:3001/api/health

# Reiniciar API
docker-compose restart api
```

### Resetar todo o ambiente

```bash
# Parar tudo e limpar volumes
docker-compose down -v

# Remover imagens antigas
docker-compose rm -f
docker rmi rhf-frequencia-api rhf-frequencia-client

# Reconstruir do zero
docker-compose build --no-cache
docker-compose up -d
```

---

## 🌐 Deploy em Servidores

### VPS/Servidor Linux (Ubuntu/Debian)

```bash
# 1. Instalar Docker e Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Clone o repositório
git clone https://github.com/robertbr123/RH-FREQUENCIA.git
cd RH-FREQUENCIA

# 3. Configure as variáveis
cp .env.example .env
nano .env

# 4. Inicie
docker-compose up -d

# 5. Configure firewall (se necessário)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### AWS EC2

1. Lance uma instância EC2 (t2.medium recomendado)
2. Instale Docker (veja acima)
3. Configure Security Groups: portas 80, 443
4. Siga os passos do VPS

### DigitalOcean / Linode / Vultr

Mesmos passos do VPS acima.

---

## 📈 Monitoramento e Logs

### Ver uso de recursos

```bash
docker stats
```

### Logs centralizados

```bash
# Todos os serviços
docker-compose logs -f --tail=100

# Apenas erros
docker-compose logs | grep -i error
```

### Exportar logs

```bash
docker-compose logs > logs_$(date +%Y%m%d).txt
```

---

## 🔄 Atualização da Aplicação

```bash
# 1. Fazer backup do banco
docker-compose exec db pg_dump -U rhf_user rhf_db > backup_pre_update.sql

# 2. Parar containers
docker-compose down

# 3. Atualizar código
git pull origin main

# 4. Reconstruir imagens
docker-compose build

# 5. Iniciar novamente
docker-compose up -d

# 6. Verificar logs
docker-compose logs -f
```

---

## 📞 Suporte

- **Issues:** https://github.com/robertbr123/RH-FREQUENCIA/issues
- **Documentação API:** http://localhost:3001/api

---

## 📝 Licença

MIT License - veja o arquivo LICENSE

---

## ✅ Checklist Pós-Instalação

- [ ] Sistema acessível em http://localhost
- [ ] Login com admin/admin123 funcionando
- [ ] Funcionários listados na página de Funcionários
- [ ] Registro de ponto funcionando
- [ ] Relatórios carregando
- [ ] Senhas padrão alteradas (produção)
- [ ] Backup configurado (produção)
- [ ] HTTPS configurado (produção)
- [ ] Monitoramento ativo (produção)

---

**Pronto! 🎉** Seu sistema está rodando em Docker!
