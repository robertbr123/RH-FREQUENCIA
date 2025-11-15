# 🔐 Credenciais de Acesso

## Credenciais de Usuários (Ambiente Docker)

### Usuários Padrão

Todos os usuários padrão têm a mesma senha: **admin123**

| Usuário | Senha | Papel | E-mail |
|---------|-------|-------|---------|
| admin | admin123 | Administrador | admin@empresa.com |
| gestor | admin123 | Gestor RH | gestor@empresa.com |
| operador | admin123 | Operador de Ponto | operador@empresa.com |

---

## Acesso ao Sistema

### Frontend (Interface Web)
- **URL**: http://localhost:8080 (Linux/macOS) ou http://localhost (Windows com docker-compose.port80.yml)
- **Porta**: 8080 (padrão) ou 80 (requer sudo no Linux)

### Backend (API)
- **URL**: http://localhost:3001/api
- **Porta**: 3001
- **Health Check**: http://localhost:3001/api/health

### Banco de Dados PostgreSQL
- **Host**: localhost
- **Porta**: 5432
- **Database**: rhf_db
- **Usuário**: rhf_user
- **Senha**: rhf_password

---

## ⚠️ IMPORTANTE - SEGURANÇA

### Antes de usar em Produção:

1. **Alterar todas as senhas padrão**
2. **Gerar novo JWT_SECRET** no arquivo `.env` ou `docker-compose.yml`
3. **Alterar credenciais do PostgreSQL**
4. **Habilitar HTTPS com certificado SSL**
5. **Configurar firewall e políticas de segurança**

### Como gerar hash de senha

Para criar um hash bcrypt de uma nova senha, execute:

```bash
docker exec rhf-api node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NOVA_SENHA', 10).then(hash => console.log(hash));"
```

### Como atualizar senha de um usuário

```bash
# Gerar o hash (substituir NOVA_SENHA)
HASH=$(docker exec rhf-api node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('NOVA_SENHA', 10).then(hash => console.log(hash));")

# Atualizar no banco (substituir USERNAME e usar o hash gerado)
docker exec rhf-postgres psql -U rhf_user -d rhf_db -c "UPDATE users SET password = 'HASH_AQUI' WHERE username = 'USERNAME';"
```

---

## Funcionários de Exemplo

O sistema vem pré-carregado com 8 funcionários de exemplo:

1. João Silva Santos - Desenvolvedor
2. Maria Santos Oliveira - Gerente de RH
3. Pedro Oliveira Costa - Analista Financeiro
4. Ana Costa Lima - Designer
5. Carlos Pereira Souza - Vendedor
6. Juliana Fernandes Alves - Contador
7. Roberto Almeida Santos - Operador
8. Fernanda Lima Rodrigues - Assistente de RH

Todos com registros de ponto dos últimos 5 dias úteis.

---

## Testando o Sistema

### Testar Login via API

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Testar Health Check

```bash
curl http://localhost:3001/api/health
```

### Verificar Logs

```bash
# Logs da API
docker logs rhf-api

# Logs do PostgreSQL
docker logs rhf-postgres

# Logs do Frontend
docker logs rhf-client
```

---

## Suporte

Para problemas relacionados a acesso ou credenciais, consulte a documentação em:
- `README-DOCKER.md` - Guia completo do Docker
- `DOCKER-QUICKSTART.md` - Guia rápido de início
- `IMPLEMENTATION-SUMMARY.md` - Resumo da implementação
