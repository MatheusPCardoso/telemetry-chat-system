import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event('resize'));
}

function hasHorizontalScroll(element: HTMLElement): boolean {
  return element.scrollWidth > element.clientWidth;
}

function renderPage(component: ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('Responsiveness Testing', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    vi.clearAllMocks();
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
  });

  afterEach(() => {
    setViewport(originalInnerWidth, originalInnerHeight);
  });

  it('renders the main pages correctly across mobile, tablet, and desktop widths', () => {
    const cases = [
      {
        component: <HomePage />,
        text: 'Chatbot Telemetry',
      },
      {
        component: <LoginPage />,
        text: 'Entrar na sua conta',
      },
      {
        component: <SignupPage />,
        text: 'Criar nova conta',
      },
      {
        component: <ChatPage />,
        text: 'Chat',
      },
    ];

    for (const viewport of Object.values(VIEWPORTS)) {
      setViewport(viewport.width, viewport.height);

      for (const testCase of cases) {
        const { container, unmount } = renderPage(testCase.component);
        expect(screen.getByText(testCase.text)).toBeInTheDocument();
        expect(hasHorizontalScroll(container.firstChild as HTMLElement)).toBe(false);
        unmount();
      }
    }
  });

  it('keeps form controls visible and full-width on login and signup at all breakpoints', () => {
    for (const viewport of Object.values(VIEWPORTS)) {
      setViewport(viewport.width, viewport.height);

      const { unmount: unmountLogin } = renderPage(<LoginPage />);
      expect(screen.getByLabelText('Email')).toHaveClass('w-full');
      expect(screen.getByLabelText('Senha')).toHaveClass('w-full');
      expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
      unmountLogin();

      const { unmount: unmountSignup } = renderPage(<SignupPage />);
      expect(screen.getByLabelText('Email')).toHaveClass('w-full');
      expect(screen.getByLabelText('Confirmar senha')).toHaveClass('w-full');
      expect(screen.getByRole('button', { name: /criar conta/i })).toBeInTheDocument();
      unmountSignup();
    }
  });

  it('keeps the chat layout usable across breakpoints', () => {
    for (const viewport of Object.values(VIEWPORTS)) {
      setViewport(viewport.width, viewport.height);
      const { container, unmount } = renderPage(<ChatPage />);

      expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeInTheDocument();
      expect(screen.getByLabelText(/Digite sua mensagem/)).toBeInTheDocument();
      expect(container.querySelector('[role=\"log\"]')).toBeInTheDocument();
      expect(hasHorizontalScroll(container.firstChild as HTMLElement)).toBe(false);

      unmount();
    }
  });

  it('uses readable text-size classes on the main textual elements', () => {
    const { unmount: unmountHome } = renderPage(<HomePage />);
    expect(screen.getByText('Chatbot Telemetry').className).toMatch(/text-5xl/);
    expect(
      screen.getByText('Converse, analise e entenda seus dados em tempo real.').className,
    ).toMatch(/text-lg/);
    unmountHome();

    const { unmount: unmountLogin } = renderPage(<LoginPage />);
    expect(screen.getByText('Entrar na sua conta').className).toMatch(/text-2xl/);
    expect(screen.getByRole('button', { name: /^entrar$/i }).className).toMatch(/text-sm/);
    unmountLogin();

    const { unmount: unmountSignup } = renderPage(<SignupPage />);
    expect(screen.getByText('Criar nova conta').className).toMatch(/text-2xl/);
    expect(screen.getByRole('button', { name: /criar conta/i }).className).toMatch(/text-sm/);
    unmountSignup();

    renderPage(<ChatPage />);
    expect(screen.getByText('Chat').className).toMatch(/text-lg/);
    expect(screen.getByText('Conectado').className).toMatch(/text-xs/);
  });

  it('keeps primary actions with touch-friendly padding on mobile', () => {
    setViewport(VIEWPORTS.mobile.width, VIEWPORTS.mobile.height);

    const { unmount: unmountHome } = renderPage(<HomePage />);
    expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveClass('px-6', 'py-3');
    unmountHome();

    const { unmount: unmountLogin } = renderPage(<LoginPage />);
    expect(screen.getByRole('button', { name: /^entrar$/i })).toHaveClass('py-3');
    unmountLogin();

    const { unmount: unmountSignup } = renderPage(<SignupPage />);
    expect(screen.getByRole('button', { name: /criar conta/i })).toHaveClass('py-3');
    unmountSignup();

    renderPage(<ChatPage />);
    expect(screen.getByRole('button', { name: 'Sair da conta' })).toHaveClass('px-3', 'py-2');
  });
});
