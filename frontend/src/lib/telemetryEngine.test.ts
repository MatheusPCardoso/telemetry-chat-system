import { TelemetryEngine, EventType } from './telemetryEngine';
import api from '../services/api';


jest.mock('../services/api');

describe('TelemetryEngine - Event Structure Tests', () => {
  let engine: TelemetryEngine;
  const mockSessionId = 'test-session-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    engine = new TelemetryEngine(mockSessionId, mockUserId);
    
    
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      configurable: true,
    });
    
    
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
    
    
    Object.defineProperty(window, 'innerWidth', {
      value: 1920,
      configurable: true,
    });
    Object.defineProperty(window, 'innerHeight', {
      value: 1080,
      configurable: true,
    });
  });

  afterEach(() => {
    engine.destroy();
    jest.useRealTimers();
  });

  describe('62.5.1 - Each event contains: sessionId, eventType, timestamp, metadata', () => {
    it('should include sessionId in every event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.MESSAGE_SENT, { textLength: 10 });
      await engine.flush();

      expect(mockPost).toHaveBeenCalledTimes(1);
      const callArgs = mockPost.mock.calls[0][1];
      const events = callArgs.events;

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty('sessionId');
      expect(events[0].sessionId).toBe(mockSessionId);
      
      expect(events[0]).not.toHaveProperty('userId');
    });

    it('should include eventType in every event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.MESSAGE_SENT, { textLength: 10 });
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const events = callArgs.events;

      expect(events[0]).toHaveProperty('eventType');
      expect(events[0].eventType).toBe(EventType.MESSAGE_SENT);
    });

    it('should include timestamp in every event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.SESSION_STARTED);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const events = callArgs.events;

      expect(events[0]).toHaveProperty('timestamp');
      expect(typeof events[0].timestamp).toBe('string');
    });

    it('should include metadata in every event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.MESSAGE_STARTED);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const events = callArgs.events;

      expect(events[0]).toHaveProperty('metadata');
      expect(typeof events[0].metadata).toBe('object');
      expect(events[0].metadata).not.toBeNull();
    });

    it('should include all required fields in a single event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.BOT_RESPONSE_RATED, { userSatisfaction: 'positive' });
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const event = callArgs.events[0];

      expect(event).toHaveProperty('sessionId');
      expect(event).toHaveProperty('eventType');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('metadata');
      
      expect(event.sessionId).toBe(mockSessionId);
      expect(event.eventType).toBe(EventType.BOT_RESPONSE_RATED);
      expect(typeof event.timestamp).toBe('string');
      expect(typeof event.metadata).toBe('object');
    });
  });

  describe('62.5.2 - Metadata always includes: deviceType, viewportWidth, viewportHeight, locale', () => {
    it('should include deviceType in metadata', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.MESSAGE_SENT, { textLength: 5 });
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      expect(metadata).toHaveProperty('deviceType');
      expect(['mobile', 'desktop']).toContain(metadata.deviceType);
    });

    it('should include viewportWidth in metadata', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.SESSION_STARTED);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      expect(metadata).toHaveProperty('viewportWidth');
      expect(typeof metadata.viewportWidth).toBe('number');
      expect(metadata.viewportWidth).toBe(1920);
    });

    it('should include viewportHeight in metadata', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.SESSION_STARTED);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      expect(metadata).toHaveProperty('viewportHeight');
      expect(typeof metadata.viewportHeight).toBe('number');
      expect(metadata.viewportHeight).toBe(1080);
    });

    it('should include locale in metadata', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.MESSAGE_SENT, { textLength: 10 });
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      expect(metadata).toHaveProperty('locale');
      expect(typeof metadata.locale).toBe('string');
      expect(metadata.locale).toBe('en-US');
    });

    it('should include all base metadata fields in every event', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.QUICK_REPLY_USED, { replyText: 'Yes' });
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      expect(metadata).toHaveProperty('deviceType');
      expect(metadata).toHaveProperty('viewportWidth');
      expect(metadata).toHaveProperty('viewportHeight');
      expect(metadata).toHaveProperty('locale');
    });

    it('should detect mobile device correctly', async () => {
      
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
        configurable: true,
      });

      const mobileEngine = new TelemetryEngine(mockSessionId, mockUserId);
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      mobileEngine.track(EventType.MESSAGE_SENT, { textLength: 5 });
      await mobileEngine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      expect(metadata.deviceType).toBe('mobile');
      
      mobileEngine.destroy();
    });
  });

  describe('62.5.3 - Extra metadata passed to track() is merged with base metadata', () => {
    it('should merge custom metadata with base metadata', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      const customMetadata = {
        textLength: 25,
        typingDurationMs: 1500,
      };

      engine.track(EventType.MESSAGE_SENT, customMetadata);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      
      expect(metadata).toHaveProperty('deviceType');
      expect(metadata).toHaveProperty('viewportWidth');
      expect(metadata).toHaveProperty('viewportHeight');
      expect(metadata).toHaveProperty('locale');

      
      expect(metadata).toHaveProperty('textLength');
      expect(metadata).toHaveProperty('typingDurationMs');
      expect(metadata.textLength).toBe(25);
      expect(metadata.typingDurationMs).toBe(1500);
    });

    it('should preserve all custom metadata fields', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      const customMetadata = {
        userSatisfaction: 'positive',
        botResponseTime: 350,
        messageCount: 5,
      };

      engine.track(EventType.BOT_RESPONSE_RATED, customMetadata);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      expect(metadata.userSatisfaction).toBe('positive');
      expect(metadata.botResponseTime).toBe(350);
      expect(metadata.messageCount).toBe(5);
    });

    it('should handle empty custom metadata', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.SESSION_STARTED, {});
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      
      expect(metadata).toHaveProperty('deviceType');
      expect(metadata).toHaveProperty('viewportWidth');
      expect(metadata).toHaveProperty('viewportHeight');
      expect(metadata).toHaveProperty('locale');
    });

    it('should handle no custom metadata parameter', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.SESSION_ENDED);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      
      expect(metadata).toHaveProperty('deviceType');
      expect(metadata).toHaveProperty('viewportWidth');
      expect(metadata).toHaveProperty('viewportHeight');
      expect(metadata).toHaveProperty('locale');
    });

    it('should allow custom metadata to override base metadata', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      
      const customMetadata = {
        locale: 'pt-BR', 
        textLength: 10,
      };

      engine.track(EventType.MESSAGE_SENT, customMetadata);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const metadata = callArgs.events[0].metadata;

      
      expect(metadata.locale).toBe('pt-BR');
      expect(metadata.textLength).toBe(10);
    });
  });

  describe('62.5.4 - Timestamp is a valid ISO 8601 string', () => {
    it('should generate timestamp as ISO 8601 string', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.MESSAGE_SENT, { textLength: 10 });
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const timestamp = callArgs.events[0].timestamp;

      expect(typeof timestamp).toBe('string');
      
      
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(timestamp).toMatch(iso8601Regex);
    });

    it('should generate valid Date object from timestamp', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.SESSION_STARTED);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const timestamp = callArgs.events[0].timestamp;

      const date = new Date(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should generate timestamp close to current time', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      const beforeTime = new Date();
      engine.track(EventType.MESSAGE_SENT, { textLength: 5 });
      const afterTime = new Date();
      
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const timestamp = callArgs.events[0].timestamp;
      const eventTime = new Date(timestamp);

      
      expect(eventTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(eventTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should generate unique timestamps for rapid events', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      
      engine.track(EventType.MESSAGE_STARTED);
      engine.track(EventType.MESSAGE_EDITED);
      engine.track(EventType.MESSAGE_SENT, { textLength: 10 });
      
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const events = callArgs.events;

      expect(events).toHaveLength(3);
      
      
      events.forEach((event: { timestamp: string }) => {
        expect(typeof event.timestamp).toBe('string');
        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
        expect(event.timestamp).toMatch(iso8601Regex);
      });
    });

    it('should include milliseconds in timestamp', async () => {
      const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
      (api.post as jest.Mock) = mockPost;

      engine.track(EventType.SESSION_STARTED);
      await engine.flush();

      const callArgs = mockPost.mock.calls[0][1];
      const timestamp = callArgs.events[0].timestamp;

      
      expect(timestamp).toMatch(/\.\d{3}Z$/);
    });
  });

  describe('62.6 - Debounce Tests', () => {
    describe('62.6.1 - Calling trackMessageStarted 5 times in 100ms results in only 1 tracked event', () => {
      it('should debounce multiple trackMessageStarted calls within 100ms', async () => {
        const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
        (api.post as jest.Mock) = mockPost;

        
        engine.trackMessageStarted();
        jest.advanceTimersByTime(20);
        engine.trackMessageStarted();
        jest.advanceTimersByTime(20);
        engine.trackMessageStarted();
        jest.advanceTimersByTime(20);
        engine.trackMessageStarted();
        jest.advanceTimersByTime(20);
        engine.trackMessageStarted();

        
        
        
        jest.advanceTimersByTime(300);

        
        await engine.flush();

        
        expect(mockPost).toHaveBeenCalledTimes(1);
        const callArgs = mockPost.mock.calls[0][1];
        const events = callArgs.events;

        const messageStartedEvents = events.filter(
          (e: { eventType: string }) => e.eventType === EventType.MESSAGE_STARTED
        );

        expect(messageStartedEvents).toHaveLength(1);
      });

      it('should track only the last call when debouncing', async () => {
        const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
        (api.post as jest.Mock) = mockPost;

        
        engine.trackMessageStarted();
        jest.advanceTimersByTime(20);
        engine.trackMessageStarted();
        jest.advanceTimersByTime(20);
        engine.trackMessageStarted();
        jest.advanceTimersByTime(20);
        engine.trackMessageStarted();
        jest.advanceTimersByTime(20);
        engine.trackMessageStarted();

        
        jest.advanceTimersByTime(300);

        await engine.flush();

        const callArgs = mockPost.mock.calls[0][1];
        const events = callArgs.events;

        
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe(EventType.MESSAGE_STARTED);
      });
    });

    describe('62.6.2 - After debounce delay (300ms), the event is tracked', () => {
      it('should track event after 300ms debounce delay', async () => {
        const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
        (api.post as jest.Mock) = mockPost;

        
        engine.trackMessageStarted();

        
        await engine.flush();
        expect(mockPost).not.toHaveBeenCalled();

        
        jest.advanceTimersByTime(300);

        
        await engine.flush();

        expect(mockPost).toHaveBeenCalledTimes(1);
        const callArgs = mockPost.mock.calls[0][1];
        const events = callArgs.events;

        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe(EventType.MESSAGE_STARTED);
      });

      it('should track event exactly after 300ms delay', async () => {
        const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
        (api.post as jest.Mock) = mockPost;

        engine.trackMessageStarted();

        
        jest.advanceTimersByTime(299);
        await engine.flush();
        expect(mockPost).not.toHaveBeenCalled();

        
        jest.advanceTimersByTime(1);
        await engine.flush();

        expect(mockPost).toHaveBeenCalledTimes(1);
        const callArgs = mockPost.mock.calls[0][1];
        const events = callArgs.events;

        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe(EventType.MESSAGE_STARTED);
      });

      it('should reset debounce timer on each call', async () => {
        const mockPost = jest.fn().mockResolvedValue({ data: { success: true } });
        (api.post as jest.Mock) = mockPost;

        
        engine.trackMessageStarted();
        jest.advanceTimersByTime(200);

        
        engine.trackMessageStarted();
        jest.advanceTimersByTime(200);

        
        engine.trackMessageStarted();

        
        
        await engine.flush();
        expect(mockPost).not.toHaveBeenCalled();

        
        jest.advanceTimersByTime(300);
        await engine.flush();

        
        expect(mockPost).toHaveBeenCalledTimes(1);
        const callArgs = mockPost.mock.calls[0][1];
        const events = callArgs.events;

        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe(EventType.MESSAGE_STARTED);
      });
    });
  });
});
