# 🔧 Guia de Instalação - Proxmox LXC

Este guia cobre a instalação do RH-FREQUENCIA em containers LXC do Proxmox.

---

## ⚠️ Problema Comum em LXC

O erro abaixo é comum em containers LXC não privilegiados:
```
Error response from daemon: failed to create task for container: 
failed to create shim task: OCI runtime create failed: runc create failed: 
unable to start container process: error during container init: 
open sysctl net.ipv4.ip_unprivileged_port_start file: reopen fd 8: permission denied
```

**Causa:** LXC não privilegiado bloqueia acesso a sysctls, impedindo containers Docker de usar portas baixas (< 1024).

**Solução:** O projeto foi ajustado para usar apenas portas não privilegiadas (≥ 1024).

---

## 📋 Criar Container LXC

### Opção 1: Container Privilegiado (Mais Fácil)

No Proxmox Web UI:

1. **Create CT** (Container)
2. **General:**
   - Hostname: `rh-frequencia`
   - Password: (sua senha)
   - ✅ **Unprivileged container: DESMARCAR** ← IMPORTANTE!
   
3. **Template:**
   - Ubuntu 22.04 ou Debian 11

4. **Resources:**
   - Cores: 2+
   - RAM: 2048 MB+
   - Swap: 512 MB

5. **Network:**
   - Bridge: vmbr0
   - IPv4: DHCP ou Static

6. **Features:**
   - ✅ Nesting
   - ✅ Keyctl

### Opção 2: Container Não Privilegiado (Mais Seguro)

Se preferir usar LXC não privilegiado, adicione estas configurações:

```bash
# No host Proxmox, edite o arquivo de configuração do container
# Substitua 100 pelo ID do seu container
nano /etc/pve/lxc/100.conf

# Adicione estas linhas: IMPORTANTE ISSO PARA LXC
lxc.apparmor.profile: unconfined
lxc.cgroup2.devices.allow: a
lxc.cap.drop:
lxc.mount.auto: proc:rw sys:rw
```

**Reinicie o container:**
```bash
pct stop 100
pct start 100
```

---

## 🚀 Instalação no Container LXC

### 1. Acesse o Container

```bash
# Via Proxmox Web UI: Console
# Ou via SSH
ssh root@ip-do-container
```

### 2. Atualizar Sistema

```bash
apt-get update
apt-get upgrade -y
apt-get install -y curl git wget
```

### 3. Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Verificar instalação
docker --version
docker compose version
```

### 4. Clonar e Executar

```bash
# Clonar repositório
cd /opt
git clone https://github.com/robertbr123/RH-FREQUENCIA.git
cd RH-FREQUENCIA

# Dar permissões aos scripts
chmod +x scripts/docker/*.sh

# Iniciar sistema
docker compose up -d

# Aguardar ~60 segundos para inicialização completa
sleep 60

# Verificar status
docker compose ps
```

### 5. Verificar Logs

```bash
# Ver logs da API
docker logs rhf-api

# Ver logs do frontend
docker logs rhf-client

# Ver logs do banco
docker logs rhf-postgres
```

---

## 🌐 Acessar o Sistema

### Via IP do Container
```
http://IP-DO-CONTAINER:8080
```

Exemplo: `http://192.168.1.100:8080`

**Login:**
- Usuário: `admin`
- Senha: `admin123`

---

## 🔀 Proxy Reverso (Opcional)

Se quiser acessar na porta 80 ou com domínio, configure um proxy reverso no **host Proxmox** ou em outro servidor.

### Nginx no Host Proxmox

```bash
# Instalar nginx no host Proxmox
apt-get install -y nginx

# Criar configuração
nano /etc/nginx/sites-available/rh-frequencia
```

Cole:
```nginx
server {
    listen 80;
    server_name rh.seudominio.com;  # ou _ para qualquer

    location / {
        proxy_pass http://IP-DO-CONTAINER:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Ativar
ln -s /etc/nginx/sites-available/rh-frequencia /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Agora acesse: `http://rh.seudominio.com`

---

## 🔧 Troubleshooting Específico LXC

### Erro: "permission denied" ao iniciar Docker

```bash
# Verificar se nesting está habilitado
cat /proc/self/status | grep CapEff

# No host Proxmox (substitua 100 pelo ID do container):
pct set 100 -features nesting=1,keyctl=1
pct stop 100
pct start 100
```

### Container Docker não inicia

```bash
# Verificar se Docker está rodando
systemctl status docker

# Reiniciar Docker
systemctl restart docker

# Ver logs do Docker daemon
journalctl -u docker -n 50
```

### Erro de rede entre containers

```bash
# Verificar rede Docker
docker network ls
docker network inspect rhf-network

# Recriar rede se necessário
docker compose down
docker network prune -f
docker compose up -d
```

### Banco de dados não inicializa

```bash
# Ver logs detalhados
docker logs rhf-postgres

# Verificar volume
docker volume ls
docker volume inspect rhf-postgres-data

# Se necessário, recriar (PERDE DADOS!)
docker compose down -v
docker compose up -d
```

---

## 💾 Backup e Restore

### Backup do Container LXC Completo (Host Proxmox)

```bash
# Criar backup do container inteiro
vzdump 100 --mode snapshot --storage local

# Backups ficam em: /var/lib/vz/dump/
```

### Backup Apenas do Banco de Dados

```bash
# Dentro do container LXC
cd /opt/RH-FREQUENCIA

# Criar backup
docker exec rhf-postgres pg_dump -U rhf_user rhf_db > backup-$(date +%Y%m%d).sql

# Copiar para o host Proxmox
# No host:
pct pull 100 /opt/RH-FREQUENCIA/backup-*.sql /root/
```

---

## 📊 Recursos Recomendados

### Mínimo
- CPU: 1 core
- RAM: 1 GB
- Disco: 10 GB

### Recomendado (Produção)
- CPU: 2+ cores
- RAM: 4 GB
- Disco: 20 GB
- Swap: 512 MB

### Ajustar Recursos no Proxmox

```bash
# Aumentar RAM (4GB)
pct set 100 -memory 4096

# Aumentar CPU (4 cores)
pct set 100 -cores 4

# Aumentar disco (30GB)
pct resize 100 rootfs +10G

# Aplicar (reiniciar container)
pct reboot 100
```

---

## 🔒 Segurança

### 1. Firewall no Container

```bash
# Instalar UFW
apt-get install -y ufw

# Regras básicas
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 8080/tcp  # RH Frequência

# Ativar
ufw enable
ufw status
```

### 2. Atualizar Senhas Padrão

```bash
# Acessar container do PostgreSQL
docker exec -it rhf-postgres psql -U rhf_user rhf_db

# Gerar hash de nova senha
docker exec rhf-api node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NOVA_SENHA_FORTE', 10).then(hash => console.log(hash));"

# Copiar o hash e executar no psql:
UPDATE users SET password = 'HASH_AQUI' WHERE username = 'admin';
\q
```

### 3. Alterar Credenciais do Banco

Edite `docker-compose.yml` e `.env`, depois:
```bash
docker compose down
docker compose up -d --build
```

---

## 🎯 Comandos Úteis

```bash
# Status dos containers
docker compose ps

# Logs em tempo real
docker compose logs -f

# Reiniciar tudo
docker compose restart

# Parar tudo
docker compose down

# Atualizar sistema
cd /opt/RH-FREQUENCIA
git pull
docker compose down
docker compose build --no-cache
docker compose up -d

# Espaço em disco
df -h
docker system df

# Limpar espaço
docker system prune -a
```

---

## 📱 Acesso Externo

### Configurar Port Forward no Roteador

1. Acesse seu roteador
2. Port Forwarding / NAT
3. Adicione regra:
   - Porta Externa: 8080
   - IP Interno: IP-DO-CONTAINER-LXC
   - Porta Interna: 8080
   - Protocolo: TCP

### Usando DDNS (IP Dinâmico)

Se seu IP muda frequentemente, use serviços gratuitos:
- DuckDNS
- No-IP
- FreeDNS

---

## ✅ Checklist de Instalação

- [ ] Container LXC criado com nesting habilitado
- [ ] Docker instalado e funcionando
- [ ] Projeto clonado em `/opt/RH-FREQUENCIA`
- [ ] Containers iniciados com `docker compose up -d`
- [ ] Sistema acessível em `http://IP:8080`
- [ ] Login funcionando (admin/admin123)
- [ ] Senhas padrão alteradas
- [ ] Firewall configurado
- [ ] Backup inicial criado
- [ ] (Opcional) Proxy reverso configurado
- [ ] (Opcional) SSL/HTTPS configurado

---

## 🆘 Suporte

- **Issues:** https://github.com/robertbr123/RH-FREQUENCIA/issues
- **Documentação:** [README-DOCKER.md](./README-DOCKER.md)
- **Linux:** [LINUX-SETUP.md](./LINUX-SETUP.md)

---

<div align="center">

**🚀 Proxmox LXC + Docker = Deploy Rápido e Eficiente**

</div>
