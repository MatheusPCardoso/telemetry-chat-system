import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SkipLink from '../components/SkipLink';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { websocketService, onBotResponse, onError, disconnect } from '../services/websocketService';
import { useTelemetry } from '../hooks/useTelemetry';
import type { Socket } from 'socket.io-client';


const INACTIVITY_TIMEOUT_MS = 30_000;

function getOrCreateSessionId(): string {
  const existing = sessionStorage.getItem('chatSessionId');
  if (existing) return existing;
  const id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem('chatSessionId', id);
  return id;
}

export default function ChatPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ratedMessages, setRatedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  
  const typingStartRef = useRef<number | null>(null);
  const lastInputValueRef = useRef<string>('');
  const hesitationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentAtRef = useRef<number | null>(null);
  const sendingRef = useRef(false);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  if (sessionIdRef.current === null) {
    sessionIdRef.current = getOrCreateSessionId();
  }

  const { messages, isConnected, isTyping, setConnected, addMessage, sessionId, setSessionId, setTyping, clearMessages } = useChatStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const {
    trackSessionStarted,
    trackSessionEnded,
    trackMessageStarted,
    trackMessageSent,
    trackMessageAbandoned,
    trackMessageEdited,
    trackQuickReplyUsed,
    trackBotResponseRated,
    trackConversationPaused,
    trackConversationResumed,
    trackMessageHesitation,
    trackRapidFireMessages,
    trackCopyBotResponse,
    trackErrorDisplayed,
    trackRetryAttempted,
    trackNetworkFailure,
  } = useTelemetry(sessionIdRef.current);

  
  useEffect(() => {
    if (lastInputValueRef.current !== '' && inputMessage === '' && !sendingRef.current) {
      trackMessageAbandoned({ textLength: lastInputValueRef.current.length });
    }
    lastInputValueRef.current = inputMessage;
  }, [inputMessage, trackMessageAbandoned]);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      trackConversationPaused();
      pausedAtRef.current = Date.now();
    }, INACTIVITY_TIMEOUT_MS);
  };

  const handleBotResponse = (data: { content: string; timestamp?: string; source?: string; quickReplies?: string[] }) => {
    addMessage({
      content: data.content,
      sender: 'bot',
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      source: data.source as 'heuristic' | 'gemini' | 'fallback' | undefined,
      quickReplies: data.quickReplies,
    });
    setTyping(false);
  };

  const handleWsError = (err: { message?: string } | string) => {
    const msg = typeof err === 'string' ? err : err?.message ?? 'Ocorreu um erro';
    setError(msg);
    trackErrorDisplayed({ errorType: 'websocket_error' });
  };

  const handleSendMessage = (message?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const msg = message || inputMessage.trim();
    if (!msg) return;

    
    if (lastSentAtRef.current !== null && Date.now() - lastSentAtRef.current < 2000) {
      trackRapidFireMessages();
    }
    lastSentAtRef.current = Date.now();

    
    if (pausedAtRef.current !== null) {
      trackConversationResumed({ pauseDurationMs: Date.now() - pausedAtRef.current });
      pausedAtRef.current = null;
    }

    
    const typingDurationMs = typingStartRef.current ? Date.now() - typingStartRef.current : 0;
    trackMessageSent({ textLength: msg.length, typingDurationMs });

    
    typingStartRef.current = null;
    if (hesitationTimerRef.current) {
      clearTimeout(hesitationTimerRef.current);
      hesitationTimerRef.current = null;
    }

    
    sendingRef.current = true;
    addMessage({ content: msg, sender: 'user', timestamp: new Date() });
    if (socket) websocketService.sendMessage(msg, sessionId || sessionIdRef.current || '');
    setInputMessage('');
    setTimeout(() => { sendingRef.current = false; }, 0);

    setTyping(true);
    resetInactivityTimer();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    
    if (typingStartRef.current === null && value !== '') {
      typingStartRef.current = Date.now();
      trackMessageStarted({ textLength: value.length });
    }

    
    if (lastInputValueRef.current !== '' && value !== lastInputValueRef.current) {
      trackMessageEdited({ textLength: value.length });
    }

    
    if (hesitationTimerRef.current) clearTimeout(hesitationTimerRef.current);
    if (value !== '') {
      hesitationTimerRef.current = setTimeout(() => {
        trackMessageHesitation({
          typingDurationMs: typingStartRef.current ? Date.now() - typingStartRef.current : 0,
          textLength: value.length,
        });
      }, 5000);
    }

    setInputMessage(value);
    resetInactivityTimer();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    else if (e.key === 'Escape') { e.preventDefault(); setInputMessage(''); }
  };

  const handleQuickReply = (reply: string) => {
    trackQuickReplyUsed({ replyText: reply });
    handleSendMessage(reply);
  };

  const handleRating = (messageId: string, satisfaction: 'positive' | 'negative') => {
    if (ratedMessages.has(messageId)) return;
    setRatedMessages((prev) => new Set(prev).add(messageId));
    trackBotResponseRated({ userSatisfaction: satisfaction });
  };

  const handleLogout = () => {
    if (socket) disconnect(socket);
    clearMessages();
    sessionStorage.removeItem('chatSessionId');
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const sid = sessionIdRef.current;
    if (!sid) {
      return;
    }

    setSessionId(sid);
    const s = websocketService.connect(sid);

    s.on('connect', () => {
      setConnected(true);
      trackSessionStarted();
      resetInactivityTimer();
    });

    s.on('disconnect', () => {
      setConnected(false);
      trackSessionEnded();
    });

    s.on('reconnect_attempt', () => {
      trackRetryAttempted({ errorType: 'websocket_reconnect' });
    });

    s.on('connect_error', () => {
      trackNetworkFailure({ errorType: 'connection_failed' });
    });

    onBotResponse(s, handleBotResponse);
    onError(s, handleWsError);
    setSocket(s);

    return () => {
      trackSessionEnded();
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      disconnect(s);
    };
    
  }, []);

  useEffect(() => {
    const messagesEnd = messagesEndRef.current;

    if (typeof messagesEnd?.scrollIntoView === 'function') {
      messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <>
      <SkipLink />
      <main id="main-content" className="flex flex-col h-screen bg-white">
        {}
        <header className="border-b border-[#d2d2d7] px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <h1 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">Chat</h1>
            <div className="flex items-center gap-4">
              <div
                role={isConnected ? 'status' : 'alert'}
                aria-live="polite"
                className="flex items-center gap-1.5"
              >
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#34c759]' : 'bg-[#ff3b30]'}`}
                  aria-hidden="true"
                />
                <span className="text-xs text-[#6e6e73]">{isConnected ? 'Conectado' : 'Desconectado'}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Sair da conta"
                className="px-3 py-2 text-sm text-[#0071e3] hover:underline focus:outline-none focus:ring-2 focus:ring-[#0071e3] rounded"
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div
            role="log"
            aria-live="polite"
            aria-label="Histórico de mensagens"
            className="max-w-3xl mx-auto space-y-4"
          >
            {messages.map((message) => (
              <div key={message.id}>
                <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    aria-label={message.sender === 'user' ? `Você disse: ${message.content}` : `Bot respondeu: ${message.content}`}
                    onCopy={message.sender === 'bot' ? () => trackCopyBotResponse({ textLength: message.content.length }) : undefined}
                    className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      message.sender === 'user'
                        ? 'bg-[#0071e3] text-white rounded-br-md'
                        : 'bg-[#f5f5f7] text-[#1d1d1f] rounded-bl-md'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>

                {}
                {message.sender === 'bot' && (
                  <div className="flex items-center gap-1 mt-1 pl-1">
                    <button
                      type="button"
                      onClick={() => handleRating(message.id, 'positive')}
                      disabled={ratedMessages.has(message.id)}
                      aria-label="Avaliar resposta como positiva"
                      className="text-base px-1.5 py-0.5 rounded hover:bg-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                    >
                      👍
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRating(message.id, 'negative')}
                      disabled={ratedMessages.has(message.id)}
                      aria-label="Avaliar resposta como negativa"
                      className="text-base px-1.5 py-0.5 rounded hover:bg-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-[#0071e3] disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                    >
                      👎
                    </button>
                  </div>
                )}

                {}
                {message.sender === 'bot' && message.quickReplies && message.quickReplies.length > 0 && (
                  <div role="group" aria-label="Respostas rápidas" className="mt-2 flex flex-wrap gap-2 pl-1">
                    {message.quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleQuickReply(reply)}
                        aria-label={`Resposta rápida: ${reply}`}
                        className="text-xs px-3 py-1.5 rounded-full border border-[#0071e3] text-[#0071e3] hover:bg-[#0071e3] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div role="status" aria-live="polite" aria-label="Bot está digitando" className="flex justify-start">
                <div className="bg-[#f5f5f7] rounded-2xl rounded-bl-md px-4 py-3">
                  <span className="text-sm text-[#6e6e73]">Digitando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {}
        {error && (
          <div className="px-6 py-2 bg-[#fff2f1] border-t border-[#ffd0ce]">
            <p className="text-sm text-[#ff3b30] text-center max-w-3xl mx-auto" role="alert">{error}</p>
          </div>
        )}

        {}
        <div className="border-t border-[#d2d2d7] px-6 py-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => handleSendMessage(undefined, e)} className="flex gap-3 items-end">
              <label htmlFor="message-input" className="sr-only">Digite sua mensagem</label>
              <textarea
                id="message-input"
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Mensagem..."
                aria-label="Digite sua mensagem. Enter para enviar, Shift+Enter para nova linha"
                rows={1}
                className="flex-1 px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-2xl resize-none text-sm text-[#1d1d1f] placeholder-[#aeaeb2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] transition-all"
                style={{ maxHeight: '120px' }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 120) + 'px';
                }}
              />
              <button
                type="submit"
                disabled={!isConnected || isTyping || !inputMessage.trim()}
                aria-label="Enviar mensagem"
                className="px-5 py-3 bg-[#0071e3] hover:bg-[#0077ed] text-white text-sm font-medium rounded-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enviar
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
