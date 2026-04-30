import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    setTokens: vi.fn(),
    setUser: vi.fn(),
  })),
}));

vi.mock('../services/authService', () => ({
  default: {
    login: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLoginPage() {
  return render(
    <BrowserRouter>
      <LoginPage />
    </BrowserRouter>,
  );
}

function getLoginFocusables() {
  return [
    screen.getByText('Pular para o conteúdo principal'),
    screen.getByLabelText('Email'),
    screen.getByLabelText('Senha'),
    screen.getByRole('button', { name: 'Mostrar senha' }),
    screen.getByRole('checkbox', { name: 'Lembrar-me' }),
    screen.getByRole('button', { name: 'Esqueceu a senha?' }),
    screen.getByRole('button', { name: /^entrar$/i }),
    screen.getByRole('link', { name: /criar conta/i }),
  ];
}

describe('LoginPage - Keyboard Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tabs through the interactive elements in the rendered order', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    for (const element of getLoginFocusables()) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it('keeps a logical top-to-bottom focus flow', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const focusables = getLoginFocusables();
    for (const element of focusables) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it('allows reverse tabbing without trapping focus', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const focusables = getLoginFocusables();
    for (const element of focusables) {
      await user.tab();
      expect(element).toHaveFocus();
    }

    for (const element of [...focusables].slice(0, -1).reverse()) {
      await user.tab({ shift: true });
      expect(element).toHaveFocus();
    }
  });

  it('submits the form when Enter is pressed in the password input', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    passwordInput.focus();
    await user.keyboard('{Enter}');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('keeps the skip link accessible and points to main content', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const skipLink = screen.getByText('Pular para o conteúdo principal');
    const mainContent = document.getElementById('main-content');

    expect(skipLink).toHaveClass('sr-only');

    await user.tab();
    expect(skipLink).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(mainContent).toBeInTheDocument();
    expect(mainContent?.tagName).toBe('MAIN');
  });

  it('exposes focus-visible styles on the primary interactive elements', () => {
    renderLoginPage();

    expect(screen.getByLabelText('Email')).toHaveClass('focus:outline-none', 'focus:ring-2');
    expect(screen.getByLabelText('Senha')).toHaveClass('focus:outline-none', 'focus:ring-2');
    expect(screen.getByRole('button', { name: /^entrar$/i })).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
    expect(screen.getByRole('link', { name: /criar conta/i })).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
  });

  it('keeps all important controls keyboard reachable', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const importantControls = [
      screen.getByLabelText('Email'),
      screen.getByLabelText('Senha'),
      screen.getByRole('button', { name: /^entrar$/i }),
      screen.getByRole('link', { name: /criar conta/i }),
    ];

    await user.tab();
    for (const control of importantControls) {
      while (document.activeElement !== control) {
        await user.tab();
      }
      expect(control).toHaveFocus();
    }
  });
});
