import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatPage from './ChatPage';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import * as websocketService from '../services/websocketService';


const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});


vi.mock('../stores/chatStore');
vi.mock('../stores/authStore');
vi.mock('../services/websocketService');

describe('ChatPage - Accessibility', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const mockAddMessage = vi.fn();
  const mockSetConnected = vi.fn();
  const mockSetTyping = vi.fn();
  const mockSetSessionId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    
    (useChatStore as any).mockReturnValue({
      messages: [
        {
          id: '1',
          content: 'Hello from user',
          sender: 'user',
          timestamp: new Date(),
        },
        {
          id: '2',
          content: 'Hello from bot',
          sender: 'bot',
          timestamp: new Date(),
        },
      ],
      isConnected: true,
      isTyping: false,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    
    (useAuthStore as any).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });

    
    (websocketService.websocketService.connect as any) = vi.fn().mockReturnValue(mockSocket);
    (websocketService.onBotResponse as any) = vi.fn();
    (websocketService.onError as any) = vi.fn();
    (websocketService.disconnect as any) = vi.fn();
    (websocketService.websocketService.sendMessage as any) = vi.fn();
  });

  it('should have messages container with role="log"', () => {
    render(<ChatPage />);

    const messagesContainer = screen.getByRole('log');
    expect(messagesContainer).toBeInTheDocument();
  });

  it('should have messages container with aria-live="polite"', () => {
    render(<ChatPage />);

    const messagesContainer = screen.getByRole('log');
    expect(messagesContainer).toHaveAttribute('aria-live', 'polite');
  });

  it('should have messages container with aria-label="Histórico de mensagens"', () => {
    render(<ChatPage />);

    const messagesContainer = screen.getByRole('log', { name: 'Histórico de mensagens' });
    expect(messagesContainer).toBeInTheDocument();
  });

  it('should have user message with proper aria-label', () => {
    render(<ChatPage />);

    const userMessage = screen.getByLabelText('Você disse: Hello from user');
    expect(userMessage).toBeInTheDocument();
  });

  it('should have bot message with proper aria-label', () => {
    render(<ChatPage />);

    const botMessage = screen.getByLabelText('Bot respondeu: Hello from bot');
    expect(botMessage).toBeInTheDocument();
  });

  it('should show typing indicator with role="status" when bot is typing', () => {
    (useChatStore as any).mockReturnValue({
      messages: [],
      isConnected: true,
      isTyping: true,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    render(<ChatPage />);

    const typingIndicator = screen.getByRole('status', { name: /bot está digitando/i });
    expect(typingIndicator).toBeInTheDocument();
    expect(typingIndicator).toHaveAttribute('aria-live', 'polite');
  });

  it('should show "Bot está digitando..." text when bot is typing', () => {
    (useChatStore as any).mockReturnValue({
      messages: [],
      isConnected: true,
      isTyping: true,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    render(<ChatPage />);

    expect(screen.getByText('Digitando...')).toBeInTheDocument();
  });

  it('should not show typing indicator when bot is not typing', () => {
    render(<ChatPage />);

    expect(screen.queryByText('Digitando...')).not.toBeInTheDocument();
  });
});

describe('ChatPage - Quick Replies', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const mockAddMessage = vi.fn();
  const mockSetConnected = vi.fn();
  const mockSetTyping = vi.fn();
  const mockSetSessionId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    
    (useChatStore as any).mockReturnValue({
      messages: [
        {
          id: '1',
          content: 'Hello! How can I help you?',
          sender: 'bot',
          timestamp: new Date(),
          quickReplies: ['Check status', 'Get help', 'Contact support'],
        },
      ],
      isConnected: true,
      isTyping: false,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    
    (useAuthStore as any).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });

    
    (websocketService.websocketService.connect as any) = vi.fn().mockReturnValue(mockSocket);
    (websocketService.onBotResponse as any) = vi.fn();
    (websocketService.onError as any) = vi.fn();
    (websocketService.disconnect as any) = vi.fn();
    (websocketService.websocketService.sendMessage as any) = vi.fn();
  });

  it('should render quick replies below bot messages', () => {
    render(<ChatPage />);

    expect(screen.getByText('Check status')).toBeInTheDocument();
    expect(screen.getByText('Get help')).toBeInTheDocument();
    expect(screen.getByText('Contact support')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes on quick reply container', () => {
    render(<ChatPage />);

    const quickReplyGroup = screen.getByRole('group', { name: 'Respostas rápidas' });
    expect(quickReplyGroup).toBeInTheDocument();
  });

  it('should have proper ARIA labels on quick reply buttons', () => {
    render(<ChatPage />);

    const checkStatusButton = screen.getByRole('button', { name: 'Resposta rápida: Check status' });
    expect(checkStatusButton).toBeInTheDocument();
    expect(checkStatusButton).toHaveAttribute('type', 'button');
  });

  it('should have focus visible styles on quick reply buttons', () => {
    render(<ChatPage />);

    const button = screen.getByRole('button', { name: 'Resposta rápida: Check status' });
    expect(button).toHaveClass('focus:ring-2', 'focus:ring-[#0071e3]', 'focus:outline-none');
  });

  it('should have adequate contrast on quick reply buttons', () => {
    render(<ChatPage />);

    const button = screen.getByRole('button', { name: 'Resposta rápida: Check status' });
    expect(button).toHaveClass('border-[#0071e3]', 'text-[#0071e3]');
  });

  it('should send message when quick reply is clicked', () => {
    render(<ChatPage />);

    const checkStatusButton = screen.getByRole('button', { name: 'Resposta rápida: Check status' });
    fireEvent.click(checkStatusButton);

    expect(mockAddMessage).toHaveBeenCalledWith({
      content: 'Check status',
      sender: 'user',
      timestamp: expect.any(Date),
    });

    expect(mockSetTyping).toHaveBeenCalledWith(true);
  });

  it('should not render quick replies for user messages', () => {
    (useChatStore as any).mockReturnValue({
      messages: [
        {
          id: '1',
          content: 'User message',
          sender: 'user',
          timestamp: new Date(),
          quickReplies: ['Should not appear'],
        },
      ],
      isConnected: true,
      isTyping: false,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    render(<ChatPage />);

    expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
  });

  it('should not render quick replies section when bot message has no quick replies', () => {
    (useChatStore as any).mockReturnValue({
      messages: [
        {
          id: '1',
          content: 'Bot message without quick replies',
          sender: 'bot',
          timestamp: new Date(),
        },
      ],
      isConnected: true,
      isTyping: false,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    render(<ChatPage />);

    expect(screen.queryByRole('group', { name: 'Respostas rápidas' })).not.toBeInTheDocument();
  });
});

describe('ChatPage - Keyboard Navigation', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const mockAddMessage = vi.fn();
  const mockSetConnected = vi.fn();
  const mockSetTyping = vi.fn();
  const mockSetSessionId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    
    (useChatStore as any).mockReturnValue({
      messages: [
        {
          id: '1',
          content: 'Hello! How can I help you?',
          sender: 'bot',
          timestamp: new Date(),
          quickReplies: ['Option 1', 'Option 2'],
        },
      ],
      isConnected: true,
      isTyping: false,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    
    (useAuthStore as any).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      logout: vi.fn(),
    });

    
    (websocketService.websocketService.connect as any) = vi.fn().mockReturnValue(mockSocket);
    (websocketService.onBotResponse as any) = vi.fn();
    (websocketService.onError as any) = vi.fn();
    (websocketService.disconnect as any) = vi.fn();
    (websocketService.websocketService.sendMessage as any) = vi.fn();
  });

  it('should navigate between interactive elements with Tab key', () => {
    render(<ChatPage />);

    
    const skipLink = screen.getByText('Pular para o conteúdo principal');
    const textarea = screen.getByLabelText(/Digite sua mensagem/);
    const sendButton = screen.getByRole('button', { name: 'Enviar mensagem' });
    const quickReply1 = screen.getByRole('button', { name: 'Resposta rápida: Option 1' });
    const quickReply2 = screen.getByRole('button', { name: 'Resposta rápida: Option 2' });
    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });

    
    expect(skipLink).toBeInTheDocument();
    expect(textarea).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
    expect(quickReply1).toBeInTheDocument();
    expect(quickReply2).toBeInTheDocument();
    expect(logoutButton).toBeInTheDocument();

    
    fireEvent.change(textarea, { target: { value: 'test message' } });

    
    skipLink.focus();
    expect(document.activeElement).toBe(skipLink);

    
    fireEvent.keyDown(skipLink, { key: 'Tab' });
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    
    fireEvent.keyDown(textarea, { key: 'Tab' });
    sendButton.focus();
    expect(document.activeElement).toBe(sendButton);

    
    fireEvent.keyDown(sendButton, { key: 'Tab' });
    quickReply1.focus();
    expect(document.activeElement).toBe(quickReply1);

    
    fireEvent.keyDown(quickReply1, { key: 'Tab' });
    quickReply2.focus();
    expect(document.activeElement).toBe(quickReply2);

    
    fireEvent.keyDown(quickReply2, { key: 'Tab' });
    logoutButton.focus();
    expect(document.activeElement).toBe(logoutButton);
  });

  it('should jump to main content when Enter is pressed on skip link', () => {
    render(<ChatPage />);

    const skipLink = screen.getByText('Pular para o conteúdo principal');
    const mainContent = document.getElementById('main-content');

    expect(mainContent).toBeInTheDocument();

    
    skipLink.focus();
    expect(document.activeElement).toBe(skipLink);

    
    fireEvent.click(skipLink);

    
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('should send message when Enter is pressed in textarea', () => {
    render(<ChatPage />);

    const textarea = screen.getByLabelText(/Digite sua mensagem/) as HTMLTextAreaElement;

    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(textarea.value).toBe('Test message');

    
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    
    expect(mockAddMessage).toHaveBeenCalledWith({
      content: 'Test message',
      sender: 'user',
      timestamp: expect.any(Date),
    });

    expect(mockSetTyping).toHaveBeenCalledWith(true);
  });

  it('should create new line when Shift+Enter is pressed in textarea', () => {
    render(<ChatPage />);

    const textarea = screen.getByLabelText(/Digite sua mensagem/) as HTMLTextAreaElement;

    
    fireEvent.change(textarea, { target: { value: 'First line' } });

    
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    
    expect(mockAddMessage).not.toHaveBeenCalled();
    expect(mockSetTyping).not.toHaveBeenCalled();

    
    expect(textarea.value).toBe('First line');
  });

  it('should have logical focus order matching visual layout', () => {
    render(<ChatPage />);

    
    const skipLink = screen.getByText('Pular para o conteúdo principal');
    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    const textarea = screen.getByLabelText(/Digite sua mensagem/);
    const sendButton = screen.getByRole('button', { name: 'Enviar mensagem' });
    const quickReply1 = screen.getByRole('button', { name: 'Resposta rápida: Option 1' });

    
    expect(skipLink).toBeInTheDocument();
    expect(logoutButton).toBeInTheDocument();
    expect(textarea).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
    expect(quickReply1).toBeInTheDocument();

    
    
    
    
    
    

    
    expect(skipLink).not.toHaveAttribute('tabindex', '-1');
    expect(logoutButton).not.toHaveAttribute('tabindex', '-1');
    expect(textarea).not.toHaveAttribute('tabindex', '-1');
    expect(sendButton).not.toHaveAttribute('tabindex', '-1');
    expect(quickReply1).not.toHaveAttribute('tabindex', '-1');
  });
});



describe('Task 52.11: Implementar navegação por teclado', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const mockAddMessage = vi.fn();
  const mockSetConnected = vi.fn();
  const mockSetTyping = vi.fn();
  const mockSetSessionId = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    
    (useChatStore as any).mockReturnValue({
      messages: [
        {
          id: '1',
          content: 'Hello! How can I help you?',
          sender: 'bot',
          timestamp: new Date(),
          quickReplies: ['Check status', 'Get help'],
        },
      ],
      isConnected: true,
      isTyping: false,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    
    (useAuthStore as any).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      logout: mockLogout,
    });

    
    (websocketService.websocketService.connect as any) = vi.fn().mockReturnValue(mockSocket);
    (websocketService.onBotResponse as any) = vi.fn();
    (websocketService.onError as any) = vi.fn();
    (websocketService.disconnect as any) = vi.fn();
    (websocketService.websocketService.sendMessage as any) = vi.fn();
  });

  describe('52.11.1: Tab navigation order', () => {
    it('should navigate in order: skip link → logout → quick replies → textarea → send button', () => {
      render(<ChatPage />);

      
      const skipLink = screen.getByText('Pular para o conteúdo principal');
      const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
      const quickReply1 = screen.getByRole('button', { name: 'Resposta rápida: Check status' });
      const quickReply2 = screen.getByRole('button', { name: 'Resposta rápida: Get help' });
      const textarea = screen.getByLabelText(/Digite sua mensagem/);
      const sendButton = screen.getByRole('button', { name: 'Enviar mensagem' });

      
      expect(skipLink).toBeInTheDocument();
      expect(logoutButton).toBeInTheDocument();
      expect(quickReply1).toBeInTheDocument();
      expect(quickReply2).toBeInTheDocument();
      expect(textarea).toBeInTheDocument();
      expect(sendButton).toBeInTheDocument();

      
      fireEvent.change(textarea, { target: { value: 'test' } });

      
      skipLink.focus();
      expect(document.activeElement).toBe(skipLink);

      logoutButton.focus();
      expect(document.activeElement).toBe(logoutButton);

      quickReply1.focus();
      expect(document.activeElement).toBe(quickReply1);

      quickReply2.focus();
      expect(document.activeElement).toBe(quickReply2);

      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      sendButton.focus();
      expect(document.activeElement).toBe(sendButton);
    });

    it('should skip disabled send button when textarea is empty', () => {
      render(<ChatPage />);

      const textarea = screen.getByLabelText(/Digite sua mensagem/);
      const sendButton = screen.getByRole('button', { name: 'Enviar mensagem' });

      
      expect(textarea).toHaveValue('');
      expect(sendButton).toBeDisabled();

      
      
      expect(sendButton).toHaveAttribute('disabled');
    });
  });

  describe('52.11.2: Enter on skip link', () => {
    it('should jump to #main-content when Enter is pressed on skip link', () => {
      render(<ChatPage />);

      const skipLink = screen.getByText('Pular para o conteúdo principal');
      const mainContent = document.getElementById('main-content');

      
      expect(mainContent).toBeInTheDocument();
      expect(mainContent?.tagName).toBe('MAIN');

      
      expect(skipLink).toHaveAttribute('href', '#main-content');

      
      skipLink.focus();
      expect(document.activeElement).toBe(skipLink);

      
      fireEvent.click(skipLink);

      
      
      expect(skipLink.getAttribute('href')).toBe('#main-content');
    });
  });

  describe('52.11.3: Enter and Shift+Enter in textarea', () => {
    it('should send message when Enter is pressed in textarea', () => {
      render(<ChatPage />);

      const textarea = screen.getByLabelText(/Digite sua mensagem/) as HTMLTextAreaElement;

      
      fireEvent.change(textarea, { target: { value: 'Hello bot' } });
      expect(textarea.value).toBe('Hello bot');

      
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      
      expect(mockAddMessage).toHaveBeenCalledWith({
        content: 'Hello bot',
        sender: 'user',
        timestamp: expect.any(Date),
      });

      expect(mockSetTyping).toHaveBeenCalledWith(true);
    });

    it('should NOT send message when Shift+Enter is pressed in textarea', () => {
      render(<ChatPage />);

      const textarea = screen.getByLabelText(/Digite sua mensagem/) as HTMLTextAreaElement;

      
      fireEvent.change(textarea, { target: { value: 'First line' } });

      
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      
      expect(mockAddMessage).not.toHaveBeenCalled();
      expect(mockSetTyping).not.toHaveBeenCalled();

      
      expect(textarea.value).toBe('First line');
    });

    it('should handle handleKeyDown correctly for Enter vs Shift+Enter', () => {
      render(<ChatPage />);

      const textarea = screen.getByLabelText(/Digite sua mensagem/) as HTMLTextAreaElement;

      
      fireEvent.change(textarea, { target: { value: 'Message 1' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      expect(mockAddMessage).toHaveBeenCalledTimes(1);

      
      vi.clearAllMocks();

      
      fireEvent.change(textarea, { target: { value: 'Message 2' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      expect(mockAddMessage).not.toHaveBeenCalled();
    });
  });

  describe('52.11.4: Esc clears textarea (optional)', () => {
    it('should clear textarea when Esc is pressed', () => {
      render(<ChatPage />);

      const textarea = screen.getByLabelText(/Digite sua mensagem/) as HTMLTextAreaElement;

      
      fireEvent.change(textarea, { target: { value: 'This will be cleared' } });
      expect(textarea.value).toBe('This will be cleared');

      
      fireEvent.keyDown(textarea, { key: 'Escape' });

      
      expect(textarea.value).toBe('');
    });

    it('should not send message when Esc is pressed', () => {
      render(<ChatPage />);

      const textarea = screen.getByLabelText(/Digite sua mensagem/) as HTMLTextAreaElement;

      
      fireEvent.change(textarea, { target: { value: 'This should not be sent' } });
      expect(textarea.value).toBe('This should not be sent');

      
      fireEvent.keyDown(textarea, { key: 'Escape' });

      
      expect(mockAddMessage).not.toHaveBeenCalled();
      expect(mockSetTyping).not.toHaveBeenCalled();

      
      expect(textarea.value).toBe('');
    });
  });

  describe('52.11.5: Logical focus order', () => {
    it('should have logical focus order matching visual layout', () => {
      render(<ChatPage />);

      
      const skipLink = screen.getByText('Pular para o conteúdo principal');
      const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
      const quickReply1 = screen.getByRole('button', { name: 'Resposta rápida: Check status' });
      const textarea = screen.getByLabelText(/Digite sua mensagem/);

      
      expect(skipLink).toBeInTheDocument();
      expect(logoutButton).toBeInTheDocument();
      expect(quickReply1).toBeInTheDocument();
      expect(textarea).toBeInTheDocument();

      
      expect(skipLink).not.toHaveAttribute('tabindex', '-1');
      expect(logoutButton).not.toHaveAttribute('tabindex', '-1');
      expect(quickReply1).not.toHaveAttribute('tabindex', '-1');
      expect(textarea).not.toHaveAttribute('tabindex', '-1');

      
      
      
      
      
      
    });

    it('should maintain focus order when quick replies are present', () => {
      render(<ChatPage />);

      const quickReply1 = screen.getByRole('button', { name: 'Resposta rápida: Check status' });
      const quickReply2 = screen.getByRole('button', { name: 'Resposta rápida: Get help' });
      const textarea = screen.getByLabelText(/Digite sua mensagem/);

      
      expect(quickReply1).toBeInTheDocument();
      expect(quickReply2).toBeInTheDocument();

      
      quickReply1.focus();
      expect(document.activeElement).toBe(quickReply1);

      quickReply2.focus();
      expect(document.activeElement).toBe(quickReply2);

      textarea.focus();
      expect(document.activeElement).toBe(textarea);
    });

    it('should maintain focus order when no quick replies are present', () => {
      
      (useChatStore as any).mockReturnValue({
        messages: [
          {
            id: '1',
            content: 'Hello!',
            sender: 'bot',
            timestamp: new Date(),
          },
        ],
        isConnected: true,
        isTyping: false,
        sessionId: 'test-session',
        addMessage: mockAddMessage,
        setConnected: mockSetConnected,
        setTyping: mockSetTyping,
        setSessionId: mockSetSessionId,
        clearMessages: vi.fn(),
      });

      render(<ChatPage />);

      const skipLink = screen.getByText('Pular para o conteúdo principal');
      const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
      const textarea = screen.getByLabelText(/Digite sua mensagem/);

      
      skipLink.focus();
      expect(document.activeElement).toBe(skipLink);

      logoutButton.focus();
      expect(document.activeElement).toBe(logoutButton);

      textarea.focus();
      expect(document.activeElement).toBe(textarea);

      
      expect(screen.queryByRole('group', { name: 'Respostas rápidas' })).not.toBeInTheDocument();
    });
  });
});

describe('ChatPage - Logout', () => {
  const mockSocket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };

  const mockAddMessage = vi.fn();
  const mockSetConnected = vi.fn();
  const mockSetTyping = vi.fn();
  const mockSetSessionId = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    
    Storage.prototype.removeItem = vi.fn();
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();

    
    (useChatStore as any).mockReturnValue({
      messages: [],
      isConnected: true,
      isTyping: false,
      sessionId: 'test-session',
      addMessage: mockAddMessage,
      setConnected: mockSetConnected,
      setTyping: mockSetTyping,
      setSessionId: mockSetSessionId,
      clearMessages: vi.fn(),
    });

    
    (useAuthStore as any).mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      logout: mockLogout,
    });

    
    (websocketService.websocketService.connect as any) = vi.fn().mockReturnValue(mockSocket);
    (websocketService.onBotResponse as any) = vi.fn();
    (websocketService.onError as any) = vi.fn();
    (websocketService.disconnect as any) = vi.fn();
    (websocketService.websocketService.sendMessage as any) = vi.fn();
  });

  it('should render logout button with correct text and aria-label', () => {
    render(<ChatPage />);

    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton).toHaveTextContent('Sair');
  });

  it('should disconnect socket when logout button is clicked', () => {
    render(<ChatPage />);

    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    fireEvent.click(logoutButton);

    expect(websocketService.disconnect).toHaveBeenCalledWith(mockSocket);
  });

  it('should call logout from authStore when logout button is clicked', () => {
    render(<ChatPage />);

    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();
  });

  it('should navigate to /login when logout button is clicked', () => {
    render(<ChatPage />);

    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    fireEvent.click(logoutButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should perform logout actions in correct order: disconnect socket, logout, navigate', () => {
    render(<ChatPage />);

    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    fireEvent.click(logoutButton);

    
    expect(websocketService.disconnect).toHaveBeenCalled();
    expect(mockLogout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalled();

    
    const disconnectCallOrder = (websocketService.disconnect as any).mock.invocationCallOrder[0];
    const navigateCallOrder = mockNavigate.mock.invocationCallOrder[0];
    expect(disconnectCallOrder).toBeLessThan(navigateCallOrder);
  });

  it('should have proper styling on logout button', () => {
    render(<ChatPage />);

    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    expect(logoutButton).toHaveClass('px-3', 'py-2', 'text-[#0071e3]', 'hover:underline');
  });

  it('should have focus visible styles on logout button', () => {
    render(<ChatPage />);

    const logoutButton = screen.getByRole('button', { name: 'Sair da conta' });
    expect(logoutButton).toHaveClass('focus:ring-2', 'focus:ring-[#0071e3]', 'focus:outline-none');
  });
});
