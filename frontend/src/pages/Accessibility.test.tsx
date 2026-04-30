import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import ChatPage from './ChatPage';


expect.extend(toHaveNoViolations);


vi.mock('../services/websocketService', () => ({
  websocketService: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    })),
    sendMessage: vi.fn(),
  },
  onBotResponse: vi.fn(),
  onError: vi.fn(),
  disconnect: vi.fn(),
}));


vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com' },
    logout: vi.fn(),
    accessToken: 'mock-token',
  })),
}));


vi.mock('../stores/chatStore', () => ({
  useChatStore: vi.fn(() => ({
    messages: [],
    isConnected: true,
    isTyping: false,
    sessionId: 'test-session',
    setConnected: vi.fn(),
    addMessage: vi.fn(),
    setSessionId: vi.fn(),
    setTyping: vi.fn(),
  })),
}));

describe('Accessibility Tests - LoginPage', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility Tests - SignupPage', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility Tests - ChatPage', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
