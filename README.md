# Telemetry Chat System

Sistema completo de chat com telemetria silenciosa, construído com NestJS, React e MongoDB.

## 🎯 Sobre o Projeto

Aplicação de chat em tempo real que coleta dados de interação do usuário de forma não-intrusiva para análise comportamental e treinamento de IA. O sistema combina:

- **Frontend**: Interface de chat com telemetria silenciosa e acessibilidade WCAG 2.1 AA
- **Backend**: API REST + WebSocket com processamento assíncrono via filas
- **Infraestrutura**: MongoDB (Replica Set) + Redis para alta disponibilidade

**Documentação detalhada**:
- [Backend README](./backend/README.md) - Arquitetura, filas, escalabilidade, testes de carga
- [Frontend README](./frontend/README.md) - Telemetria, acessibilidade, testes

---

## 🚀 Quick Start

### Executar com Docker (Recomendado)

```bash
# 1. Configurar variáveis de ambiente do backend
cd backend
cp .env.example .env
# Edite backend/.env e adicione sua GEMINI_API_KEY para melhor experiência
cd ..

# 2. Iniciar toda a infraestrutura
docker-compose up -d

# 3. Aguardar serviços ficarem prontos (~30s)
# Acessar: http://localhost:5173
```

**Serviços iniciados**:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- MongoDB: localhost:27017
- Redis: localhost:6379

**Sobre as variáveis de ambiente**:
- **Backend**: Lê de `backend/.env` (copie de `.env.example`). O docker-compose sobrescreve `DATABASE_URL` e `REDIS_HOST` para usar os nomes dos serviços Docker.
- **Frontend**: Variáveis definidas diretamente no `docker-compose.yml` (não precisa de arquivo .env).
- **MongoDB/Redis**: Configuração hardcoded no docker-compose (usuário: `chatbot`, senha: `chatbot123`).

**⚠️ Importante - Gemini API Key**:
Para uma melhor experiência no chat, configure `GEMINI_API_KEY` no `backend/.env`. O sistema usa o modelo **gemini-2.5-flash-lite** para respostas inteligentes. Sem a chave, o bot funcionará com respostas de fallback básicas.

Obtenha sua chave gratuita em: https://aistudio.google.com/apikey

### Parar os serviços

```bash
docker-compose down

# Remover volumes (limpar dados)
docker-compose down -v
```

---

## ️ Desenvolvimento Local (Opcional)

Se preferir rodar os serviços fora do Docker:

### 1. Iniciar apenas a infraestrutura

```bash
# Subir apenas MongoDB e Redis
docker-compose up mongodb redis -d
```

### 2. Backend

```bash
cd backend

# Instalar dependências
npm install

# Configurar .env (copiar de .env.example)
cp .env.example .env

# Rodar migrations
npx prisma generate

# Iniciar em modo desenvolvimento
npm run dev

# Ou com cluster mode
npm start
```

### 3. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Configurar .env (copiar de .env.example)
cp .env.example .env

# Iniciar em modo desenvolvimento
npm run dev
```

---

## 🔧 Variáveis de Ambiente

### Backend (.env)
```env
DATABASE_URL=mongodb://chatbot:chatbot123@localhost:27017/chatbot?authSource=admin&replicaSet=rs0
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
REFRESH_TOKEN_SECRET=your-refresh-secret
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

---

## ⚙️ Configuração do MongoDB (Replica Set)

O projeto utiliza um **Replica Set** do MongoDB (rs0) para garantir alta disponibilidade e suporte a transações ACID. O script `init-replica-set.sh` automatiza a configuração inicial:

**O que o script faz**:
1. **Gera keyfile**: Cria chave de autenticação entre membros do replica set
2. **Inicia MongoDB temporário**: Sobe instância sem autenticação para configuração
3. **Configura replica set**: Executa `rs.initiate()` se ainda não configurado
4. **Cria usuário root**: Define credenciais de administrador
5. **Reinicia com autenticação**: Sobe MongoDB em modo seguro

**Por que MongoDB? (Teorema CAP)**:

O sistema prioriza **AP (Availability + Partition Tolerance)** do teorema CAP:
- **Disponibilidade**: Sistema continua operando mesmo com falhas parciais
- **Tolerância a partições**: Resiste a problemas de rede entre nós
- **Trade-off**: Eventual consistency (aceitável para telemetria)

Para telemetria, **disponibilidade e throughput** são mais críticos que consistência forte. MongoDB oferece ~10x mais capacidade de escrita comparado a bancos CP (Consistency + Partition Tolerance).

**Por que Replica Set?**:
- **Transações ACID**: Necessárias para operações críticas (auth, chat)
- **Alta disponibilidade**: Failover automático em caso de falha
- **Consistência eventual**: Garante propagação de dados entre nós
- **Requisito do Prisma**: ORM exige replica set para transações

**Nota**: Mesmo com apenas 1 nó, o replica set é necessário para funcionalidades avançadas do MongoDB.

---

## 🚨 Troubleshooting

### MongoDB não inicia
```bash
# Verificar logs
docker-compose logs mongodb

# Recriar volume
docker-compose down -v
docker-compose up mongodb -d
```

### Backend não conecta no MongoDB
```bash
# Aguardar replica set inicializar (~30s)
docker-compose logs mongodb | grep "transition to primary complete"

# Verificar health
curl http://localhost:3000/health/db
```

### Frontend não conecta no backend
```bash
# Verificar se backend está rodando
curl http://localhost:3000/health

# Verificar variáveis de ambiente
cat frontend/.env
```

---

## 📚 Recursos Adicionais

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [MongoDB Replica Sets](https://www.mongodb.com/docs/manual/replication/)
