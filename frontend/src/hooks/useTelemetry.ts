import { useRef, useEffect, useCallback } from 'react';
import { TelemetryEngine, EventType } from '../lib/telemetryEngine';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';

export function useTelemetry(sessionIdOverride?: string) {
  const engineRef = useRef<TelemetryEngine | null>(null);
  const { sessionId: storedSessionId } = useChatStore();
  const { user } = useAuthStore();
  const sessionId = sessionIdOverride ?? storedSessionId;

  useEffect(() => {
    if (!user?.id || !sessionId) {
      return;
    }

    const engine = new TelemetryEngine(sessionId, user.id);
    engineRef.current = engine;

    const flushPendingEvents = () => {
      void engine.flush();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingEvents();
      }
    };

    window.addEventListener('beforeunload', flushPendingEvents);
    window.addEventListener('pagehide', flushPendingEvents);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushPendingEvents);
      window.removeEventListener('pagehide', flushPendingEvents);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (engineRef.current === engine) {
        engine.destroy();
        engineRef.current = null;
      }
    };
  }, [user?.id, sessionId]);

  
  const trackMessageStarted = useCallback((metadata?: { textLength?: number }) => {
    if (engineRef.current) {
      engineRef.current.trackMessageStarted(metadata || {});
    }
  }, []);

  
  const trackMessageSent = useCallback((metadata: { textLength: number; typingDurationMs?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.MESSAGE_SENT, metadata);
    }
  }, []);

  
  const trackMessageEdited = useCallback((metadata?: { textLength?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.MESSAGE_EDITED, metadata || {});
    }
  }, []);

  
  const trackMessageAbandoned = useCallback((metadata?: { textLength?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.MESSAGE_ABANDONED, metadata || {});
    }
  }, []);

  
  const trackSessionStarted = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.track(EventType.SESSION_STARTED);
    }
  }, []);

  
  const trackSessionEnded = useCallback((metadata?: { pauseDurationMs?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.SESSION_ENDED, metadata || {});
    }
  }, []);

  
  const trackBotResponseRated = useCallback((metadata: { userSatisfaction: 'positive' | 'negative'; botResponseTime?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.BOT_RESPONSE_RATED, metadata);
    }
  }, []);

  
  const trackConversationPaused = useCallback((metadata?: { pauseDurationMs?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.CONVERSATION_PAUSED, metadata || {});
    }
  }, []);

  
  const trackConversationResumed = useCallback((metadata?: { pauseDurationMs?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.CONVERSATION_RESUMED, metadata || {});
    }
  }, []);

  
  const trackQuickReplyUsed = useCallback((metadata: { replyText: string }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.QUICK_REPLY_USED, metadata);
    }
  }, []);

  
  const trackMessageHesitation = useCallback((metadata: { typingDurationMs: number; textLength?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.MESSAGE_HESITATION, metadata);
    }
  }, []);

  
  const trackRapidFireMessages = useCallback((metadata?: { messageCount?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.RAPID_FIRE_MESSAGES, metadata || {});
    }
  }, []);

  
  const trackCopyBotResponse = useCallback((metadata?: { textLength?: number }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.COPY_BOT_RESPONSE, metadata || {});
    }
  }, []);

  
  const trackErrorDisplayed = useCallback((metadata: { errorType: string }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.ERROR_DISPLAYED, metadata);
    }
  }, []);

  
  const trackRetryAttempted = useCallback((metadata?: { errorType?: string }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.RETRY_ATTEMPTED, metadata || {});
    }
  }, []);

  
  const trackNetworkFailure = useCallback((metadata?: { errorType?: string }) => {
    if (engineRef.current) {
      engineRef.current.track(EventType.NETWORK_FAILURE, metadata || {});
    }
  }, []);

  
  return {
    trackMessageStarted,
    trackMessageSent,
    trackMessageEdited,
    trackMessageAbandoned,
    trackSessionStarted,
    trackSessionEnded,
    trackBotResponseRated,
    trackConversationPaused,
    trackConversationResumed,
    trackQuickReplyUsed,
    trackMessageHesitation,
    trackRapidFireMessages,
    trackCopyBotResponse,
    trackErrorDisplayed,
    trackRetryAttempted,
    trackNetworkFailure,
  };
}
