# 🐧 Guia de Instalação - Linux

Este guia cobre a instalação e configuração do sistema RH-FREQUENCIA em servidores Linux.

---

## 📋 Pré-requisitos

### Sistema Operacional
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- Fedora 35+
- Outras distribuições com kernel 3.10+

### Software Necessário
- Docker 20.10+
- Docker Compose 2.0+
- Git

---

## 🚀 Instalação Rápida

### 1. Instalar Docker (Ubuntu/Debian)

```bash
# Atualizar pacotes
sudo apt-get update

# Instalar dependências
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Adicionar chave GPG do Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar instalação
docker --version
docker compose version
```

### 2. Configurar Usuário (Opcional - permite usar Docker sem sudo)

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Aplicar mudanças (ou faça logout/login)
newgrp docker

# Testar
docker ps
```

### 3. Clonar e Executar o Projeto

```bash
# Clonar repositório
git clone https://github.com/robertbr123/RH-FREQUENCIA.git
cd RH-FREQUENCIA

# Dar permissão aos scripts
chmod +x scripts/docker/*.sh

# Iniciar sistema (porta 8080)
docker compose up -d

# OU com sudo para porta 80
sudo docker compose -f docker-compose.port80.yml up -d
```

---

## 🔧 Configuração de Portas

### Opção 1: Porta 8080 (Recomendado - Não requer root)

```bash
# Usar o docker-compose.yml padrão
docker compose up -d

# Acessar em: http://seu-servidor:8080
```

### Opção 2: Porta 80 (Requer sudo ou configuração especial)

**Método A - Usando sudo:**
```bash
sudo docker compose -f docker-compose.port80.yml up -d

# Acessar em: http://seu-servidor
```

**Método B - Configurar portas não privilegiadas (sem sudo):**
```bash
# Permitir que qualquer processo use portas < 1024
sudo sysctl net.ipv4.ip_unprivileged_port_start=80

# Tornar permanente
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee -a /etc/sysctl.conf

# Depois pode usar porta 80 sem sudo
docker compose -f docker-compose.port80.yml up -d
```

### Opção 3: Usar Nginx como Proxy Reverso

```bash
# Instalar Nginx
sudo apt-get install -y nginx

# Criar configuração
sudo nano /etc/nginx/sites-available/rh-frequencia
```

Cole o seguinte conteúdo:
```nginx
server {
    listen 80;
    server_name seu-dominio.com;  # ou _ para qualquer domínio

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/rh-frequencia /etc/nginx/sites-enabled/

# Remover site padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Agora pode acessar em http://seu-servidor
```

---

## 🔒 Configuração de Firewall

### UFW (Ubuntu/Debian)

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH (importante!)
sudo ufw allow 22/tcp

# Permitir porta 8080
sudo ufw allow 8080/tcp

# OU porta 80 se usar proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp  # HTTPS

# Verificar status
sudo ufw status
```

### FirewallD (CentOS/RHEL/Fedora)

```bash
# Permitir porta 8080
sudo firewall-cmd --permanent --add-port=8080/tcp

# OU porta 80/443
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp

# Recarregar
sudo firewall-cmd --reload

# Verificar
sudo firewall-cmd --list-all
```

---

## 🔐 SSL/HTTPS com Let's Encrypt (Produção)

```bash
# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obter certificado (substitua seu-dominio.com)
sudo certbot --nginx -d seu-dominio.com -d www.seu-dominio.com

# Renovação automática (já configurado por padrão)
sudo certbot renew --dry-run
```

---

## 🔄 Systemd - Iniciar Automaticamente

Criar serviço systemd para iniciar containers na inicialização:

```bash
# Criar arquivo de serviço
sudo nano /etc/systemd/system/rh-frequencia.service
```

Cole o conteúdo:
```ini
[Unit]
Description=RH Frequencia Docker Compose Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/caminho/para/RH-FREQUENCIA
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

```bash
# Recarregar systemd
sudo systemctl daemon-reload

# Habilitar serviço
sudo systemctl enable rh-frequencia

# Iniciar serviço
sudo systemctl start rh-frequencia

# Verificar status
sudo systemctl status rh-frequencia
```

---

## 📊 Monitoramento

### Verificar Logs

```bash
# Todos os containers
docker compose logs -f

# Container específico
docker logs -f rhf-api
docker logs -f rhf-client
docker logs -f rhf-postgres

# Últimas 100 linhas
docker logs --tail=100 rhf-api
```

### Verificar Recursos

```bash
# Uso de recursos
docker stats

# Espaço em disco
docker system df
```

---

## 🔧 Troubleshooting Linux

### Erro: "permission denied" ao rodar Docker

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Logout e login novamente, ou:
newgrp docker
```

### Erro: "port is already allocated"

```bash
# Verificar o que está usando a porta
sudo lsof -i :8080
sudo lsof -i :80

# Parar o processo ou mudar a porta em docker-compose.yml
```

### Erro: "no space left on device"

```bash
# Limpar containers/imagens não utilizados
docker system prune -a

# Verificar espaço
df -h
docker system df
```

### Erro: "OCI runtime create failed"

```bash
# Geralmente relacionado a SELinux (CentOS/RHEL)
sudo setenforce 0

# Tornar permanente (editar /etc/selinux/config)
sudo sed -i 's/SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

### Container reiniciando continuamente

```bash
# Ver logs para identificar erro
docker logs rhf-api

# Verificar health check
docker inspect rhf-api | grep -A 10 Health
```

---

## 🔄 Atualização do Sistema

```bash
# Parar containers
docker compose down

# Atualizar código
git pull origin main

# Reconstruir imagens
docker compose build --no-cache

# Iniciar novamente
docker compose up -d

# Verificar logs
docker compose logs -f
```

---

## 💾 Backup e Restauração

### Backup

```bash
# Backup do banco de dados
./scripts/docker/backup.sh

# Ou manualmente
docker exec rhf-postgres pg_dump -U rhf_user rhf_db > backup.sql
```

### Restauração

```bash
# Restaurar backup
./scripts/docker/restore.sh backup.sql

# Ou manualmente
docker exec -i rhf-postgres psql -U rhf_user rhf_db < backup.sql
```

---

## 📈 Otimizações de Performance

### 1. Configurar Limites de Recursos

Editar `docker-compose.yml`:

```yaml
services:
  api:
    # ... outras configurações
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 2. Ajustar PostgreSQL

```bash
# Editar configuração do PostgreSQL
docker exec rhf-postgres sh -c 'echo "max_connections = 100" >> /var/lib/postgresql/data/postgresql.conf'
docker exec rhf-postgres sh -c 'echo "shared_buffers = 256MB" >> /var/lib/postgresql/data/postgresql.conf'

# Reiniciar container
docker restart rhf-postgres
```

---

## 🆘 Suporte

- **Issues**: https://github.com/robertbr123/RH-FREQUENCIA/issues
- **Documentação**: [README-DOCKER.md](./README-DOCKER.md)
- **Quick Start**: [DOCKER-QUICKSTART.md](./DOCKER-QUICKSTART.md)

---

## ✅ Checklist de Produção

- [ ] Alterar senhas padrão (admin, gestor, operador)
- [ ] Configurar JWT_SECRET único
- [ ] Alterar senha do PostgreSQL
- [ ] Configurar SSL/HTTPS
- [ ] Configurar firewall
- [ ] Configurar backup automático
- [ ] Configurar monitoramento
- [ ] Testar restauração de backup
- [ ] Documentar credenciais em local seguro
- [ ] Configurar logs centralizados (opcional)

---

<div align="center">

**Desenvolvido com ❤️ para facilitar a gestão de RH**

</div>
