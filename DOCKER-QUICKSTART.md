# 🚀 Quick Start - Docker

Guia rápido de comandos para executar o sistema.

---

## ⚡ Iniciar (escolha um)

### Produção (porta 80)
```bash
./scripts/docker/start-prod.sh
# ou
docker-compose up -d
```

### Desenvolvimento (porta 5173 com hot-reload)
```bash
./scripts/docker/start-dev.sh
# ou
docker-compose -f docker-compose.dev.yml up -d
```

---

## 🛑 Parar

```bash
./scripts/docker/stop.sh
# ou
docker-compose stop
```

---

## 📋 Ver Logs

```bash
./scripts/docker/logs.sh
# ou
docker-compose logs -f
```

---

## 💾 Backup

```bash
./scripts/docker/backup.sh
```

---

## ♻️ Restaurar Backup

```bash
./scripts/docker/restore.sh
```

---

## 🧹 Limpar Tudo

```bash
./scripts/docker/clean.sh
```

---

## 🌐 Acessar

- **Produção:** http://localhost
- **Dev:** http://localhost:5173
- **API:** http://localhost:3001/api/health

**Login:** admin / admin123

---

## 📖 Documentação Completa

Ver: `README-DOCKER.md`
