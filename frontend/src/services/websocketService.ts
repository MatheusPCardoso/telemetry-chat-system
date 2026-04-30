import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

interface BotResponse {
  content: string;
  source: 'heuristic' | 'gemini' | 'fallback';
  quickReplies?: string[];
  timestamp: Date;
}

interface WebSocketService {
  connect: (sessionId: string) => Socket;
  disconnect: () => void;
  sendMessage: (message: string, sessionId: string) => void;
  onBotResponse: (callback: (response: BotResponse) => void) => void;
  onError: (callback: (error: string) => void) => void;
}

class WebSocketServiceImpl implements WebSocketService {
  private socket: Socket | null = null;
  private wsUrl: string;

  constructor() {
    this.wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
  }

  connect(sessionId: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      throw new Error('No access token available');
    }

    this.socket = io(this.wsUrl, {
      auth: {
        token: accessToken,
        sessionId,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`WebSocket reconnection attempt ${attemptNumber}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected successfully after ${attemptNumber} attempts`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed after all attempts');
      this.disconnect();
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendMessage(message: string, _sessionId: string): void {
    if (!this.socket?.connected) {
      console.error('WebSocketService: Socket not connected');
      return;
    }

    this.socket.emit('chat_message', { message });
  }

  onBotResponse(callback: (response: BotResponse) => void): void {
    if (!this.socket) {
      console.error('WebSocketService: Socket not initialized');
      return;
    }

    this.socket.on('bot-response', callback);
  }

  onError(callback: (error: string) => void): void {
    if (!this.socket) {
      console.error('WebSocketService: Socket not initialized');
      return;
    }

    this.socket.on('error', callback);
  }
}





export function sendMessage(socket: Socket, message: string): void {
  socket.emit('chat_message', { message });
}



export function onBotResponse(socket: Socket, callback: (data: any) => void): void {
  socket.on('bot_response', callback);
}



export function onError(socket: Socket, callback: (error: any) => void): void {
  socket.on('error', callback);
}



export function disconnect(socket: Socket): void {
  socket.disconnect();
}

export const websocketService = new WebSocketServiceImpl();
export type { WebSocketService, BotResponse };
