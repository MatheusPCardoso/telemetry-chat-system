import { useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../services/api';
import { useTelemetry } from './useTelemetry';

const mockUseChatStore = vi.fn();
const mockUseAuthStore = vi.fn();

vi.mock('../stores/chatStore', () => ({
  useChatStore: () => mockUseChatStore(),
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

function TelemetryHarness({ sessionIdOverride }: { sessionIdOverride?: string }) {
  const { trackSessionStarted } = useTelemetry(sessionIdOverride);

  useEffect(() => {
    trackSessionStarted();
  }, [trackSessionStarted]);

  return null;
}

describe('useTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChatStore.mockReturnValue({ sessionId: null });
    mockUseAuthStore.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
    });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
  });

  it('flushes tracked events on beforeunload using the override session id', async () => {
    render(<TelemetryHarness sessionIdOverride="session-override-123" />);

    window.dispatchEvent(new Event('beforeunload'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    expect(api.post).toHaveBeenCalledWith('/collect', {
      events: [
        expect.objectContaining({
          sessionId: 'session-override-123',
          eventType: 'session_started',
        }),
      ],
    });
  });
});
