import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import HomePage from './HomePage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ChatPage from './ChatPage';

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    setTokens: vi.fn(),
    setUser: vi.fn(),
    user: { id: 'user-1', email: 'test@example.com' },
    logout: vi.fn(),
  })),
}));

vi.mock('../stores/chatStore', () => ({
  useChatStore: vi.fn(() => ({
    messages: [],
    isConnected: true,
    isTyping: false,
    sessionId: 'test-session',
    addMessage: vi.fn(),
    setConnected: vi.fn(),
    setTyping: vi.fn(),
    setSessionId: vi.fn(),
    clearMessages: vi.fn(),
  })),
}));

vi.mock('../services/authService', () => ({
  default: {
    login: vi.fn(),
    signup: vi.fn(),
  },
}));

vi.mock('../services/websocketService', () => ({
  websocketService: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    })),
    sendMessage: vi.fn(),
  },
  onBotResponse: vi.fn(),
  onError: vi.fn(),
  disconnect: vi.fn(),
}));

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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderPage(component: ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

async function expectFocusOrder(user: ReturnType<typeof userEvent.setup>, elements: HTMLElement[]) {
  for (const element of elements) {
    await user.tab();
    expect(element).toHaveFocus();
  }
}

describe('Keyboard Navigation - All Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps HomePage keyboard accessible', async () => {
    const user = userEvent.setup();
    renderPage(<HomePage />);

    const focusables = [
      screen.getByText('Pular para o conteúdo principal'),
      screen.getByRole('link', { name: /^entrar$/i }),
      screen.getByRole('link', { name: /criar conta/i }),
    ];

    await expectFocusOrder(user, focusables);
    await user.tab({ shift: true });
    expect(focusables[1]).toHaveFocus();
  });

  it('keeps LoginPage keyboard accessible with the current focus order', async () => {
    const user = userEvent.setup();
    renderPage(<LoginPage />);

    const focusables = [
      screen.getByText('Pular para o conteúdo principal'),
      screen.getByLabelText('Email'),
      screen.getByLabelText('Senha'),
      screen.getByRole('button', { name: 'Mostrar senha' }),
      screen.getByRole('checkbox', { name: 'Lembrar-me' }),
      screen.getByRole('button', { name: 'Esqueceu a senha?' }),
      screen.getByRole('button', { name: /^entrar$/i }),
      screen.getByRole('link', { name: /criar conta/i }),
    ];

    await expectFocusOrder(user, focusables);
    await user.tab({ shift: true });
    expect(focusables[6]).toHaveFocus();
  });

  it('keeps SignupPage keyboard accessible with the current focus order', async () => {
    const user = userEvent.setup();
    renderPage(<SignupPage />);

    const passwordToggles = screen.getAllByRole('button', { name: 'Mostrar senha' });
    const focusables = [
      screen.getByText('Pular para o conteúdo principal'),
      screen.getByLabelText('Email'),
      screen.getByLabelText('Senha'),
      passwordToggles[0],
      screen.getByLabelText('Confirmar senha'),
      passwordToggles[1],
      screen.getByRole('button', { name: /criar conta/i }),
      screen.getByRole('link', { name: /ir para página de login/i }),
    ];

    await expectFocusOrder(user, focusables);
    await user.tab({ shift: true });
    expect(focusables[6]).toHaveFocus();
  });

  it('keeps ChatPage keyboard accessible and only exposes send after typing', async () => {
    const user = userEvent.setup();
    renderPage(<ChatPage />);

    const skipLink = screen.getByText('Pular para o conteúdo principal');
    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    const textarea = screen.getByLabelText(/Digite sua mensagem/);
    const sendButton = screen.getByRole('button', { name: 'Enviar mensagem' });

    await expectFocusOrder(user, [skipLink, logoutButton, textarea]);
    expect(sendButton).toBeDisabled();

    await user.type(textarea, 'Test message');
    expect(sendButton).not.toBeDisabled();

    await user.tab();
    expect(sendButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(textarea).toHaveFocus();
  });

  it('activates skip links without removing access to main content', async () => {
    const user = userEvent.setup();
    const pages = [<HomePage />, <LoginPage />, <SignupPage />, <ChatPage />];

    for (const page of pages) {
      const { unmount } = renderPage(page);
      const skipLink = screen.getByText('Pular para o conteúdo principal');
      const mainContent = document.getElementById('main-content');

      await user.tab();
      expect(skipLink).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(mainContent).toBeInTheDocument();
      unmount();
    }
  });

  it('exposes visible focus styles on the key controls of every page', () => {
    const { unmount: unmountHome } = renderPage(<HomePage />);
    expect(screen.getByText('Pular para o conteúdo principal')).toHaveClass('focus:ring-2');
    expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveClass('focus:ring-2');
    unmountHome();

    const { unmount: unmountLogin } = renderPage(<LoginPage />);
    expect(screen.getByLabelText('Email')).toHaveClass('focus:outline-none', 'focus:ring-2');
    expect(screen.getByRole('button', { name: /^entrar$/i })).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
    expect(screen.getByRole('link', { name: /criar conta/i })).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
    unmountLogin();

    const { unmount: unmountSignup } = renderPage(<SignupPage />);
    expect(screen.getByLabelText('Confirmar senha')).toHaveClass('focus:outline-none', 'focus:ring-2');
    expect(screen.getByRole('link', { name: /ir para página de login/i })).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
    unmountSignup();

    renderPage(<ChatPage />);
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
    expect(screen.getByLabelText(/Digite sua mensagem/)).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
  });

  it('submits auth forms when Enter is pressed in their inputs', async () => {
    const user = userEvent.setup();

    const { unmount: unmountLogin } = renderPage(<LoginPage />);
    const loginEmail = screen.getByLabelText('Email');
    const loginPassword = screen.getByLabelText('Senha');
    await user.type(loginEmail, 'test@example.com');
    await user.type(loginPassword, 'password123');
    loginPassword.focus();
    await user.keyboard('{Enter}');
    expect(loginPassword).toHaveValue('password123');
    unmountLogin();

    renderPage(<SignupPage />);
    const signupEmail = screen.getByLabelText('Email');
    const signupPassword = screen.getByLabelText('Senha');
    const confirmPassword = screen.getByLabelText('Confirmar senha');
    await user.type(signupEmail, 'test@example.com');
    await user.type(signupPassword, 'password123');
    await user.type(confirmPassword, 'password123');
    confirmPassword.focus();
    await user.keyboard('{Enter}');
    expect(confirmPassword).toHaveValue('password123');
  });
});
