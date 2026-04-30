import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryEngine, EventType } from '../telemetryEngine';
import api from '../../services/api';

vi.mock('../../services/api');

describe('TelemetryEngine - Retry Exponential', () => {
  let engine: TelemetryEngine;
  const userId = 'test-user-id';
  const sessionId = 'test-session-id';

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new TelemetryEngine(sessionId, userId);
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('62.4.1 - Mock api.post to fail first 2 calls and succeed on 3rd', () => {
    it('should retry and eventually succeed on 3rd attempt', async () => {
      
      let callCount = 0;
      vi.mocked(api.post).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: { success: true } });
      });

      
      engine.track(EventType.MESSAGE_SENT, { textLength: 10 });
      
      
      await engine.flush();

      
      await new Promise(resolve => setTimeout(resolve, 400));

      
      expect(api.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('62.4.2 - Test that sendBatch is called 3 times total', () => {
    it('should call api.post exactly 3 times when first 2 attempts fail', async () => {
      
      vi.mocked(api.post)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true } });

      
      engine.track(EventType.SESSION_STARTED);
      
      
      await engine.flush();

      
      await new Promise(resolve => setTimeout(resolve, 400));

      
      expect(api.post).toHaveBeenCalledTimes(3);
      
      
      const firstCall = vi.mocked(api.post).mock.calls[0];
      const secondCall = vi.mocked(api.post).mock.calls[1];
      const thirdCall = vi.mocked(api.post).mock.calls[2];
      
      expect(firstCall[0]).toBe('/collect');
      expect(secondCall[0]).toBe('/collect');
      expect(thirdCall[0]).toBe('/collect');
      
      expect(firstCall[1]).toEqual(secondCall[1]);
      expect(secondCall[1]).toEqual(thirdCall[1]);
    });
  });

  describe('62.4.3 - Test exponential backoff delay pattern (100ms, 200ms)', () => {
    it('should follow exponential backoff pattern between retries', async () => {
      
      const callTimestamps: number[] = [];
      vi.mocked(api.post).mockImplementation(() => {
        callTimestamps.push(Date.now());
        if (callTimestamps.length <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({ data: { success: true } });
      });

      
      engine.track(EventType.MESSAGE_SENT);
      
      
      await engine.flush();

      
      await new Promise(resolve => setTimeout(resolve, 450));

      
      expect(callTimestamps).toHaveLength(3);

      
      const firstDelay = callTimestamps[1] - callTimestamps[0];
      const secondDelay = callTimestamps[2] - callTimestamps[1];

      
      expect(firstDelay).toBeGreaterThanOrEqual(80);
      expect(firstDelay).toBeLessThanOrEqual(120);
      
      expect(secondDelay).toBeGreaterThanOrEqual(180);
      expect(secondDelay).toBeLessThanOrEqual(220);
    });
  });

  describe('62.4.4 - Mock api.post to fail 3 times and verify no exception thrown (silent)', () => {
    it('should silently discard events after 3 failed attempts without throwing', async () => {
      
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'));

      
      engine.track(EventType.ERROR_DISPLAYED, { errorType: 'network' });
      
      
      await expect(engine.flush()).resolves.not.toThrow();

      
      await new Promise(resolve => setTimeout(resolve, 450));

      
      expect(api.post).toHaveBeenCalledTimes(3);
    });

    it('should not throw when sendBatch fails silently in background', async () => {
      
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'));

      
      engine.track(EventType.MESSAGE_STARTED);
      engine.track(EventType.MESSAGE_SENT);
      
      
      const flushPromise = engine.flush();
      
      
      await expect(flushPromise).resolves.toBeUndefined();

      
      await new Promise(resolve => setTimeout(resolve, 450));

      
      expect(api.post).toHaveBeenCalledTimes(3);
    });
  });
});
