# Backend - Telemetry System

Sistema de telemetria em tempo real construído com NestJS, focado em alta performance e escalabilidade.

## 🏗️ Arquitetura

### Teorema CAP e Escolha do Banco

O sistema prioriza **AP (Availability + Partition Tolerance)** do teorema CAP:

- **MongoDB**: Escolhido por eventual consistency, alta disponibilidade e performance em writes
- **Justificativa**: Para telemetria, disponibilidade e throughput são mais críticos que consistência forte
- **Trade-off**: Aceitamos eventual consistency em troca de ~10x mais capacidade de escrita

### Arquitetura de Filas (Performance-First)

```
API Request → Redis Queue → Background Processor → MongoDB
    ↓              ↓                ↓                  ↓
  <50ms        10k ops/s        5 workers        Batch Insert
```

**Benefícios**:
- API retorna em <50ms (não espera gravação no banco)
- Desacoplamento entre recepção e processamento
- Batch processing reduz carga no banco em ~10x
- Retry automático em caso de falhas

**Componentes**:
- **BullMQ**: Gerenciamento de filas com Redis
- **TelemetryProcessor**: 5 workers concorrentes processando eventos
- **LogProcessor**: Buffer de 50 logs com flush a cada 5s

## 📦 Módulos

### Ingestion
- **Função**: Recebe eventos de telemetria via REST
- **Endpoint**: `POST /collect`
- **Fluxo**: Valida → Enfileira → Retorna 202 Accepted
- **Proteção**: JWT auth, rate limiting

### Logging
- **Função**: Sistema de logs estruturado com persistência assíncrona
- **Estratégia**: Buffer em memória + batch insert
- **Otimização**: Reduz writes no banco em ~50x

### WebSocket (Chat)
- **Função**: Comunicação bidirecional em tempo real
- **Protocolo**: Socket.IO
- **Features**: Autenticação, sessões, broadcast
- **Integração**: Bot com Gemini AI

### Auth
- **Função**: Autenticação JWT com refresh tokens
- **Segurança**: bcrypt (12 rounds), tokens de curta duração
- **Endpoints**: `/auth/signup`, `/auth/login`, `/auth/refresh`

### Bot
- **Função**: Respostas automáticas com fallback
- **Provider**: Google Gemini AI
- **Resiliência**: Timeout 5s, retry com backoff, fallback local

### Health
- **Função**: Health checks para monitoramento
- **Endpoints**: 
  - `GET /health` - Status básico
  - `GET /health/db` - Conexão MongoDB
  - `GET /health/redis` - Conexão Redis

## 🚀 Escalabilidade

### Cluster Mode
- **Workers**: 1-3 processos Node.js (auto-scaling)
- **CPU Threshold**: Scale up em 70%, down em 30%
- **Benefício**: 3x throughput na API (recepção de requisições)

**Importante**: Cluster resolve o throughput da **API**, mas **não resolve** o gargalo de **escrita no banco**. Todos os workers compartilham o mesmo MongoDB, então o limite de write permanece o mesmo.

### Limites Atuais
- **API Throughput**: ~1.500-3.000 req/s
- **MongoDB Writes**: ~1.000-5.000 eventos/s
- **Redis Queue**: ~10.000+ ops/s

## 🛠️ Stack

- **Runtime**: Node.js 20+ com TypeScript
- **Framework**: NestJS 11
- **Database**: MongoDB (Prisma ORM)
- **Queue**: Redis + BullMQ
- **WebSocket**: Socket.IO
- **AI**: Google Gemini
- **Auth**: JWT + bcrypt

## 📊 Performance

### Otimizações Implementadas
- ✅ Batch processing (eventos e logs)
- ✅ Async queue architecture
- ✅ Connection pooling (Prisma)
- ✅ Timeout policies (cockatiel)
- ✅ Cluster mode com auto-scaling

### Métricas Esperadas
- Latência API: <50ms (p95)
- Throughput: 1.000-5.000 eventos/s
- Disponibilidade: >99.9%

## 🧪 Testes

### Unit & E2E Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

### Load Tests (Performance)

O sistema inclui testes de carga usando **autocannon** para validar throughput e latência.

#### Teste Manual (servidor já rodando)
```bash
# 1. Criar usuário de teste
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}'

# 2. Executar teste de carga
npm run test:load
```

**Configuração**:
- **Duração**: 30 segundos
- **Conexões**: 100 simultâneas
- **Target**: `POST /collect` (telemetria)
- **Métricas**: Requests/s, latência (p50, p99), throughput, erros

#### Teste Automatizado (inicia servidor + testa + para)
```bash
npm run test:load:auto
```

Este comando:
1. Inicia o servidor em cluster mode
2. Aguarda servidor ficar pronto
3. Cria usuário de teste automaticamente
4. Executa teste de carga
5. Para o servidor e exibe resultados

#### Debug de Requisições
```bash
npm run test:load:debug
```

Envia uma única requisição e mostra detalhes completos (útil para troubleshooting).

#### Variáveis de Ambiente
```bash
API_URL=http://localhost:3000 \
TEST_EMAIL=custom@example.com \
TEST_PASSWORD=CustomPass123! \
npm run test:load
```

## 🚦 Executar

```bash
# Desenvolvimento (single process)
npm run dev

# Produção (cluster mode)
npm run start:prod

# Build
npm run build
```

## 📝 Variáveis de Ambiente

```env
DATABASE_URL=mongodb://localhost:27017/telemetry
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret
REFRESH_TOKEN_SECRET=your-refresh-secret
GEMINI_API_KEY=your-gemini-key
```
