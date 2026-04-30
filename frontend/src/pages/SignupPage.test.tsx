import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SignupPage from './SignupPage';

vi.mock('../services/authService', () => ({
  default: {
    signup: vi.fn(),
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

function renderSignupPage() {
  return render(
    <BrowserRouter>
      <SignupPage />
    </BrowserRouter>,
  );
}

function getSignupFocusables() {
  const passwordToggles = screen.getAllByRole('button', { name: 'Mostrar senha' });

  return [
    screen.getByText('Pular para o conteúdo principal'),
    screen.getByLabelText('Email'),
    screen.getByLabelText('Senha'),
    passwordToggles[0],
    screen.getByLabelText('Confirmar senha'),
    passwordToggles[1],
    screen.getByRole('button', { name: /criar conta/i }),
    screen.getByRole('link', { name: /ir para página de login/i }),
  ];
}

describe('SignupPage - Keyboard Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tabs through the interactive elements in the rendered order', async () => {
    const user = userEvent.setup();
    renderSignupPage();

    for (const element of getSignupFocusables()) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it('keeps a logical top-to-bottom focus flow', async () => {
    const user = userEvent.setup();
    renderSignupPage();

    const focusables = getSignupFocusables();
    for (const element of focusables) {
      await user.tab();
      expect(element).toHaveFocus();
    }
  });

  it('allows reverse tabbing without trapping focus', async () => {
    const user = userEvent.setup();
    renderSignupPage();

    const focusables = getSignupFocusables();
    for (const element of focusables) {
      await user.tab();
      expect(element).toHaveFocus();
    }

    for (const element of [...focusables].slice(0, -1).reverse()) {
      await user.tab({ shift: true });
      expect(element).toHaveFocus();
    }
  });

  it('submits the form when Enter is pressed in the confirm password input', async () => {
    const user = userEvent.setup();
    renderSignupPage();

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Senha');
    const confirmPasswordInput = screen.getByLabelText('Confirmar senha');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');

    confirmPasswordInput.focus();
    await user.keyboard('{Enter}');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
    expect(confirmPasswordInput).toHaveValue('password123');
  });

  it('keeps the skip link accessible and points to main content', async () => {
    const user = userEvent.setup();
    renderSignupPage();

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
    renderSignupPage();

    expect(screen.getByLabelText('Email')).toHaveClass('focus:outline-none', 'focus:ring-2');
    expect(screen.getByLabelText('Senha')).toHaveClass('focus:outline-none', 'focus:ring-2');
    expect(screen.getByLabelText('Confirmar senha')).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
    expect(screen.getByRole('button', { name: /criar conta/i })).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
    expect(screen.getByRole('link', { name: /ir para página de login/i })).toHaveClass(
      'focus:outline-none',
      'focus:ring-2',
    );
  });

  it('keeps all important controls keyboard reachable', async () => {
    const user = userEvent.setup();
    renderSignupPage();

    const importantControls = [
      screen.getByLabelText('Email'),
      screen.getByLabelText('Senha'),
      screen.getByLabelText('Confirmar senha'),
      screen.getByRole('button', { name: /criar conta/i }),
      screen.getByRole('link', { name: /ir para página de login/i }),
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
