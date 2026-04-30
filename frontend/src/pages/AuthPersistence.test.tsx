import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import LoginPage from './LoginPage';
import ChatPage from './ChatPage';
import authService from '../services/authService';
import * as websocketService from '../services/websocketService';


vi.mock('../services/authService');
vi.mock('../services/websocketService');
vi.mock('../hooks/useTelemetry', () => ({
  useTelemetry: vi.fn(() => ({
    trackMessageStarted: vi.fn(),
    trackMessageSent: vi.fn(),
    trackMessageEdited: vi.fn(),
    trackMessageAbandoned: vi.fn(),
    trackSessionStarted: vi.fn(),
    trackSessionEnded: vi.fn(),
    trackBotResponseRated: vi.fn(),
    trackConversationPaused: vi.fn(),
    trackConversationResumed: vi.fn(),
    trackQuickReplyUsed: vi.fn(),
    trackMessageHesitation: vi.fn(),
    trackRapidFireMessages: vi.fn(),
    trackCopyBotResponse: vi.fn(),
    trackErrorDisplayed: vi.fn(),
    trackRetryAttempted: vi.fn(),
    trackNetworkFailure: vi.fn(),
  })),
}));

describe('Task 55.7 - Testar persistência de autenticação', () => {
  let mockSocket: any;

  beforeEach(() => {
    
    useAuthStore.getState().logout();
    useChatStore.setState({
      messages: [],
      isConnected: false,
      isTyping: false,
      sessionId: null,
    });

    
    localStorage.clear();
    sessionStorage.clear();

    
    mockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: true,
    };

    
    vi.mocked(websocketService.websocketService.connect).mockReturnValue(mockSocket);
    vi.mocked(websocketService.onBotResponse).mockImplementation(() => {});
    vi.mocked(websocketService.onError).mockImplementation(() => {});
    vi.mocked(websocketService.disconnect).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('55.7.1 - Fazer login', async () => {
    const user = userEvent.setup();

    
    const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.test';
    const mockRefreshToken = 'refresh-token-123';

    vi.mocked(authService.login).mockResolvedValue({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
    });

    
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    
    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');
    const submitButton = screen.getByRole('button', { name: /Entrar/i });

    await user.type(emailInput, 'test@test.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
    });

    
    expect(localStorage.getItem('accessToken')).toBe(mockAccessToken);
    expect(localStorage.getItem('refreshToken')).toBe(mockRefreshToken);

    
    const authState = useAuthStore.getState();
    expect(authState.accessToken).toBe(mockAccessToken);
    expect(authState.refreshToken).toBe(mockRefreshToken);
    expect(authState.isAuthenticated).toBe(true);
  });

  it('55.7.2 e 55.7.3 - Recarregar página (F5) e verificar que continua autenticado', async () => {
    
    const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.test';
    const mockRefreshToken = 'refresh-token-123';

    
    localStorage.setItem('accessToken', mockAccessToken);
    localStorage.setItem('refreshToken', mockRefreshToken);

    
    useAuthStore.getState().hydrate();

    
    const authState = useAuthStore.getState();
    expect(authState.accessToken).toBe(mockAccessToken);
    expect(authState.refreshToken).toBe(mockRefreshToken);

    
    render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    );

    
    await waitFor(() => {
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    
    expect(screen.getByLabelText(/Digite sua mensagem/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar/i })).toBeInTheDocument();
  });

  it('55.7.4 - Verificar que chat reconecta automaticamente', async () => {
    
    const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.test';
    const mockRefreshToken = 'refresh-token-123';

    localStorage.setItem('accessToken', mockAccessToken);
    localStorage.setItem('refreshToken', mockRefreshToken);
    useAuthStore.getState().hydrate();

    
    const { unmount: unmount1 } = render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    );

    
    await waitFor(() => {
      expect(websocketService.websocketService.connect).toHaveBeenCalled();
    });

    
    const connectCall = vi.mocked(websocketService.websocketService.connect).mock.calls[0];
    expect(connectCall).toBeDefined();

    
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));

    
    const connectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')?.[1];
    if (connectHandler) {
      connectHandler();
    }

    
    await waitFor(() => {
      expect(screen.getAllByText('Conectado').length).toBeGreaterThan(0);
    });

    
    unmount1();

    
    await waitFor(() => {
      expect(websocketService.disconnect).toHaveBeenCalled();
    });

    
    vi.clearAllMocks();

    
    const newMockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
      connected: true,
    };
    vi.mocked(websocketService.websocketService.connect).mockReturnValue(newMockSocket);

    
    render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    );

    
    await waitFor(() => {
      expect(websocketService.websocketService.connect).toHaveBeenCalled();
    });

    
    const newConnectHandler = newMockSocket.on.mock.calls.find((call: any) => call[0] === 'connect')?.[1];
    if (newConnectHandler) {
      newConnectHandler();
    }

    
    await waitFor(() => {
      expect(screen.getAllByText('Conectado').length).toBeGreaterThan(0);
    });
  });

  it('Integração completa: Login → Reload → Chat reconecta', async () => {
    const user = userEvent.setup();

    
    const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxNjE2MjM5OTIyfQ.test';
    const mockRefreshToken = 'refresh-token-123';

    vi.mocked(authService.login).mockResolvedValue({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
    });

    const { unmount: unmountLogin } = render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Senha'), 'password123');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));

    await waitFor(() => {
      expect(localStorage.getItem('accessToken')).toBe(mockAccessToken);
    });

    unmountLogin();

    
    
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });

    
    useAuthStore.getState().hydrate();

    
    render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    );

    
    await waitFor(() => {
      expect(screen.getByText('Chat')).toBeInTheDocument();
    });

    
    await waitFor(() => {
      expect(websocketService.websocketService.connect).toHaveBeenCalled();
    });

    
    expect(screen.getByLabelText(/Digite sua mensagem/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar/i })).toBeInTheDocument();
  });
});
