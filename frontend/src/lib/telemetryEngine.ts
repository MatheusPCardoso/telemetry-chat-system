

import api from '../services/api';

export enum EventType {
  MESSAGE_STARTED = 'message_started',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_ABANDONED = 'message_abandoned',
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  BOT_RESPONSE_RATED = 'bot_response_rated',
  CONVERSATION_PAUSED = 'conversation_paused',
  CONVERSATION_RESUMED = 'conversation_resumed',
  QUICK_REPLY_USED = 'quick_reply_used',
  MESSAGE_HESITATION = 'message_hesitation',
  RAPID_FIRE_MESSAGES = 'rapid_fire_messages',
  COPY_BOT_RESPONSE = 'copy_bot_response',
  ERROR_DISPLAYED = 'error_displayed',
  RETRY_ATTEMPTED = 'retry_attempted',
  NETWORK_FAILURE = 'network_failure',
}

export interface TelemetryEvent {
  userId: string;
  sessionId: string;
  eventType: EventType;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export class TelemetryEngine {
  private queue: TelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionId: string;
  private userId: string;
  private readonly FLUSH_INTERVAL_MS = 10000;
  private readonly FLUSH_SIZE = 20;
  private readonly DEBOUNCE_DELAY_MS = 300;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.queue = [];
    this.flushTimer = null;
    this.debounceTimer = null;
  }

  private getBaseMetadata(): Record<string, unknown> {
    return {
      deviceType: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      locale: navigator.language,
    };
  }

  public track(eventType: EventType, metadata: Record<string, unknown> = {}): void {
    const event: TelemetryEvent = {
      userId: this.userId,
      sessionId: this.sessionId,
      eventType,
      timestamp: new Date().toISOString(),
      metadata: {
        ...this.getBaseMetadata(),
        ...metadata,
      },
    };

    this.queue.push(event);

    if (this.queue.length >= this.FLUSH_SIZE) {
      this.flush();
    }

    if (this.flushTimer === null) {
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL_MS);
    }
  }

  
  public trackMessageStarted(metadata: Record<string, unknown> = {}): void {
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    
    this.debounceTimer = setTimeout(() => {
      this.track(EventType.MESSAGE_STARTED, metadata);
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY_MS);
  }

  public async flush(): Promise<void> {
    
    if (this.queue.length === 0) {
      return;
    }

    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    
    const batch = [...this.queue];
    this.queue = [];

    
    this.sendBatch(batch).catch(() => {});
  }

  private async sendBatch(events: TelemetryEvent[], attempt = 1): Promise<void> {
    try {
      
      const eventsWithoutUserId = events.map(({ userId: _userId, ...event }) => event);
      
      
      await api.post('/collect', { events: eventsWithoutUserId });
    } catch {
      
      if (attempt < 3) {
        
        const delay = Math.pow(2, attempt - 1) * 100; 
        
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        
        return this.sendBatch(events, attempt + 1);
      }
      
      
      
    }
  }

  public destroy(): void {
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    
    this.flush();
  }
}
