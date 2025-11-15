# 📊 Sistema RH - Controle de Frequência

Sistema completo de gestão de Recursos Humanos com foco em controle de ponto eletrônico, gestão de funcionários e geração de relatórios.

![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

---

## 🚀 Quick Start com Docker (Recomendado)

A forma mais rápida de rodar o sistema completo:

```bash
# Clone o repositório
git clone https://github.com/robertbr123/RH-FREQUENCIA.git
cd RH-FREQUENCIA

# Execute o teste de configuração
./scripts/docker/test-setup.sh


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


# Inicie o sistema
make prod
# ou
./scripts/docker/start-prod.sh

# Acesse: http://localhost:8080
# Login: admin / admin123

# Para usar porta 80 (requer sudo):
# sudo docker-compose -f docker-compose.port80.yml up -d
```

📖 **Documentação completa Docker:** [README-DOCKER.md](./README-DOCKER.md)  
⚡ **Guia rápido:** [DOCKER-QUICKSTART.md](./DOCKER-QUICKSTART.md)  
🐧 **Instalação Linux:** [LINUX-SETUP.md](./LINUX-SETUP.md)  
🔧 **Proxmox LXC:** [PROXMOX-LXC.md](./PROXMOX-LXC.md)

---

## ✨ Funcionalidades

### 👥 Gestão de Funcionários
- ✅ Cadastro completo de funcionários (dados pessoais, documentos, contatos)
- ✅ Upload de foto
- ✅ Importação/Exportação CSV em massa
- ✅ Filtros avançados (departamento, cargo, setor, status)
- ✅ Ativação/desativação de funcionários
- ✅ Geração de fichas de funcionário (PDF)

### ⏰ Controle de Ponto
- ✅ Sistema de múltiplos pontos (entrada, intervalo, saída)
- ✅ Registro via QR Code ou manual
- ✅ Validação de horários com tolerância
- ✅ Cálculo automático de horas trabalhadas
- ✅ Histórico completo de registros
- ✅ Edição de pontos (apenas administradores)

### 🏢 Estrutura Organizacional
- ✅ Gestão de departamentos
- ✅ Gestão de cargos
- ✅ Gestão de setores
- ✅ Gestão de unidades/filiais
- ✅ Configuração de horários de trabalho
- ✅ Cadastro de feriados

### 📊 Relatórios e Dashboards
- ✅ Dashboard com estatísticas em tempo real
- ✅ Relatórios de frequência por período
- ✅ Exportação para CSV/Excel
- ✅ Gráficos de presença e atrasos
- ✅ Indicadores de performance

### 👤 Controle de Acesso
- ✅ Sistema de autenticação JWT
- ✅ 3 níveis de acesso (Admin, Gestor, Operador)
- ✅ Permissões granulares por funcionalidade
- ✅ Gestão de usuários do sistema

### 🎨 Interface
- ✅ Design moderno e responsivo
- ✅ Tema claro/escuro
- ✅ Animações e feedback visual
- ✅ PWA (Progressive Web App)
- ✅ Otimizado para mobile

---

## 🛠️ Tecnologias

### Backend
- **Node.js** + **Express** - API REST
- **PostgreSQL 15** - Banco de dados
- **JWT** - Autenticação
- **Bcrypt** - Criptografia de senhas

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **React Router** - Navegação
- **Axios** - Requisições HTTP
- **Recharts** - Gráficos
- **date-fns** - Manipulação de datas

### DevOps
- **Docker** + **Docker Compose** - Containerização
- **Nginx** - Proxy reverso e servidor web
- **GitHub Actions** - CI/CD (opcional)

---

## 📦 Estrutura do Projeto

```
RH-FREQUENCIA/
├── api/                      # Backend (Node.js + Express)
│   ├── routes/              # Rotas da API
│   ├── middleware/          # Middlewares (auth, etc)
│   ├── database.js          # Configuração PostgreSQL
│   └── index.js             # Entry point
│
├── client/                   # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── context/         # Context API (Auth, Settings)
│   │   └── utils/           # Utilitários
│   └── public/              # Assets estáticos
│
├── scripts/                  # Scripts de automação
│   ├── docker/              # Scripts Docker
│   ├── init-db.sql          # Inicialização do BD
│   └── seed-data.sql        # Dados de exemplo
│
├── docker-compose.yml        # Configuração produção
├── docker-compose.dev.yml    # Configuração desenvolvimento
├── Dockerfile.api            # Imagem Docker da API
├── Dockerfile.client         # Imagem Docker do Frontend
├── nginx.conf                # Configuração Nginx
├── Makefile                  # Comandos facilitados
└── README-DOCKER.md          # Documentação Docker
```

---

## 🐳 Instalação e Execução

### Opção 1: Docker (Recomendado) ⭐

**Produção:**
```bash
make prod
# ou
docker-compose up -d
```

**Desenvolvimento:**
```bash
make dev
# ou
docker-compose -f docker-compose.dev.yml up -d
```

**Comandos úteis:**
```bash
make help        # Ver todos os comandos
make logs        # Ver logs
make backup      # Backup do banco
make stop        # Parar containers
make clean       # Limpar tudo
```

### Opção 2: Manual (Sem Docker)

**Pré-requisitos:**
- Node.js 18+
- PostgreSQL 15+
- npm ou yarn

**Backend:**
```bash
# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Instalar dependências
cd api
npm install

# Iniciar
npm start
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

---

## 🔐 Credenciais Padrão

Após a primeira execução, os seguintes usuários são criados:

| Usuário | Senha | Papel |
|---------|-------|-------|
| admin | admin123 | Administrador |
| gestor | admin123 | Gestor |
| operador | admin123 | Operador |

⚠️ **IMPORTANTE:** Troque essas senhas em produção!

---

## 📱 Screenshots

### Dashboard
![Dashboard](./docs/screenshots/dashboard.png)

### Gestão de Funcionários
![Funcionários](./docs/screenshots/employees.png)

### Registro de Ponto
![Ponto](./docs/screenshots/attendance.png)

*(Adicione suas screenshots na pasta `docs/screenshots/`)*

---

## 🧪 Testes

```bash
# Testar configuração Docker
./scripts/docker/test-setup.sh

# Health check
./scripts/docker/health-check.sh
# ou
make health
```

---

## 📚 Documentação Adicional

- [Documentação Docker](./README-DOCKER.md) - Guia completo Docker
- [Quick Start Docker](./DOCKER-QUICKSTART.md) - Comandos rápidos
- [API Documentation](./docs/API.md) - Endpoints da API *(criar se necessário)*
- [Deployment Guide](./docs/DEPLOYMENT.md) - Deploy em produção *(criar se necessário)*

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 🐛 Troubleshooting

### Erro de conexão com banco de dados
```bash
# Verificar logs do PostgreSQL
docker-compose logs db

# Verificar se o container está rodando
docker-compose ps
```

### Frontend não carrega
```bash
# Reconstruir o frontend
docker-compose build client
docker-compose up -d client
```

### Porta já em uso
```bash
# Verificar processos usando a porta
sudo lsof -i :80

# Mudar a porta em docker-compose.yml
```

Mais soluções: [README-DOCKER.md - Troubleshooting](./README-DOCKER.md#-troubleshooting)

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**Roberto Albino**
- GitHub: [@robertbr123](https://github.com/robertbr123)
- Projeto: [RH-FREQUENCIA](https://github.com/robertbr123/RH-FREQUENCIA)

---

## 🙏 Agradecimentos

- Comunidade open source
- Todos os contribuidores
- Usuários que reportam bugs e sugerem melhorias

---

## 📈 Roadmap

- [ ] Integração com biometria
- [ ] App mobile nativo (React Native)
- [ ] Notificações push
- [ ] Integração com folha de pagamento
- [ ] Relatórios avançados (PDF)
- [ ] Suporte multi-idiomas
- [ ] API GraphQL
- [ ] Testes automatizados (Jest/Cypress)

---

<div align="center">

**⭐ Se este projeto foi útil, considere dar uma estrela!**

[![GitHub stars](https://img.shields.io/github/stars/robertbr123/RH-FREQUENCIA?style=social)](https://github.com/robertbr123/RH-FREQUENCIA/stargazers)

</div>
