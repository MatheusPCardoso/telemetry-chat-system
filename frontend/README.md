# Frontend - Telemetry Chat Application

Interface de chat em tempo real com sistema de telemetria silenciosa, construída com React e TypeScript.

## 🎯 Propósito

Aplicação de chat que coleta dados de interação do usuário de forma não-intrusiva para análise comportamental e treinamento de IA.

## 🏗️ Arquitetura

### Telemetria Silenciosa (Core do Sistema)

**Estratégia de Batching**:
```
Evento → Queue Local → Batch (20 eventos OU 10s) → POST /collect
```

**Características**:
- **Non-blocking**: Operações assíncronas que não travam o event loop
- **UI-first**: Telemetria nunca bloqueia interações do usuário
- **Retry com backoff**: 3 tentativas (100ms, 200ms, 400ms)
- **Flush inteligente**: beforeunload, pagehide, visibilitychange
- **Debounce**: MESSAGE_STARTED aguarda 300ms de inatividade

**Eventos Capturados** (16 tipos):
- Interação com mensagens: started, sent, edited, abandoned
- Sessão: started, ended, paused, resumed
- Comportamento: hesitation, rapid_fire, copy_response
- Feedback: bot_response_rated, quick_reply_used
- Erros: error_displayed, retry_attempted, network_failure

### Comunicação Real-Time

**WebSocket (Socket.IO)**:
- Chat bidirecional em tempo real
- Reconexão automática (5 tentativas)
- Autenticação via JWT no handshake
- Transporte: WebSocket puro (sem fallback HTTP)

**HTTP REST**:
- Autenticação (signup, login, refresh)
- Telemetria (batch de eventos)
- Separação clara de responsabilidades

### Gerenciamento de Estado

**Zustand** (state management):
- `authStore`: JWT tokens, user info, persistência
- `chatStore`: Mensagens, sessionId, histórico

**Por que Zustand?**:
- Simples e performático
- Sem boilerplate (vs Redux)
- Suporte nativo a persistência
- TypeScript-first

## ♿ Acessibilidade (WCAG 2.1 AA)

### Implementações

✅ **Navegação por Teclado**:
- Tab navigation em todos os elementos interativos
- Enter/Space para ações
- Escape para fechar modais
- Skip links para conteúdo principal

✅ **ARIA Labels**:
- Roles semânticos (main, navigation, form)
- aria-label em botões de ícone
- aria-live para mensagens do bot
- aria-describedby para erros de formulário

✅ **Contraste de Cores**:
- Ratio mínimo 4.5:1 para texto normal
- Ratio mínimo 3:1 para texto grande
- Validado com axe-core

✅ **Responsividade**:
- Mobile-first design
- Breakpoints: 640px, 768px, 1024px
- Touch targets ≥44x44px

### Testes de Acessibilidade

```typescript
// Automated testing com jest-axe
import { axe } from 'jest-axe';

test('should not have accessibility violations', async () => {
  const { container } = render(<LoginPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Nota**: Testes automatizados cobrem ~30-40% das diretrizes WCAG. Validação completa requer testes manuais com leitores de tela (NVDA, JAWS, VoiceOver).

## 📦 Componentes

### Páginas

**LoginPage / SignupPage**:
- Formulários com validação client-side
- Feedback de erros acessível
- Persistência de sessão (localStorage)

**ChatPage**:
- Interface de chat minimalista
- Auto-scroll para novas mensagens
- Indicador de digitação
- Quick replies (sugestões de resposta)

### Serviços

**api.ts**:
- Axios com interceptors
- Auto-refresh de JWT expirado
- Tratamento global de erros

**websocketService.ts**:
- Gerenciamento de conexão Socket.IO
- Reconexão automática
- Event handlers tipados

**authService.ts**:
- Login, signup, refresh token
- Decodificação de JWT
- Validação de expiração

### Hooks Customizados

**useTelemetry**:
- Inicializa TelemetryEngine
- 16 métodos de tracking tipados
- Cleanup automático no unmount

## 🛠️ Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite 6
- **Styling**: TailwindCSS 4
- **State**: Zustand
- **HTTP**: Axios
- **WebSocket**: Socket.IO Client
- **Router**: React Router v7
- **Testing**: Vitest + Testing Library + jest-axe
- **Linting**: ESLint 9

## 🧪 Testes

### Unit Tests
```bash
# Rodar todos os testes
npm test

# Watch mode
npm run test:watch
```

**Cobertura**:
- TelemetryEngine (batching, retry, flush)
- useTelemetry hook (lifecycle, tracking)
- WebSocket service (conexão, reconexão)
- Auth service (login, token refresh)

### Testes de Acessibilidade
```bash
# Incluídos nos unit tests
npm test -- Accessibility
npm test -- ColorContrast
npm test -- KeyboardNavigation
```

**Ferramentas**:
- `jest-axe`: Validação automática WCAG
- `@testing-library/user-event`: Simulação de interações
- `axe-core`: Engine de análise de acessibilidade

### Testes de Componentes
```bash
# Testes de páginas
npm test -- LoginPage
npm test -- ChatPage
npm test -- SignupPage
```

## 🚀 Executar

```bash
# Desenvolvimento
npm run dev
# Acessa: http://localhost:5173

# Lint
npm run lint
```

## 📊 Performance

### Otimizações Implementadas

✅ **Telemetria**:
- Batching reduz requests em ~20x
- Debounce evita eventos duplicados
- Operações assíncronas preservam responsividade da UI
- Event loop nunca bloqueado por telemetria

✅ **React**:
- useCallback para funções estáveis
- useMemo para computações pesadas
- Lazy loading de rotas (code splitting)

## 🔒 Segurança

- **JWT em localStorage**: Ciente do risco de XSS, mas aceitável para demonstração. Em produção, migrar para httpOnly cookies
- Refresh token para renovação automática
- HTTPS obrigatório em produção
- Sanitização de inputs
- Rate limiting no backend

## 📝 Variáveis de Ambiente

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 🎨 Design System

**Inspiração**: Apple Human Interface Guidelines
- Minimalismo funcional
- Hierarquia visual clara
- Animações sutis (ease-in-out)
- Espaçamento consistente (8px grid)

**Cores**:
- Primary: Blue (#007AFF)
- Success: Green (#34C759)
- Error: Red (#FF3B30)
- Background: White/Gray scale

## 📱 Responsividade

- **Mobile**: 320px - 639px (single column)
- **Tablet**: 640px - 1023px (adaptativo)
- **Desktop**: 1024px+ (max-width container)

## 🔄 Fluxo de Dados

```
User Action → Component → useTelemetry → TelemetryEngine → Queue
                                                              ↓
                                                         Batch (20 ou 10s)
                                                              ↓
                                                         POST /collect
                                                              ↓
                                                         Backend Queue
```
