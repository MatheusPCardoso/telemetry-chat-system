import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, onBotResponse, onError, disconnect } from './websocketService';
import { Socket } from 'socket.io-client';

describe('WebSocket Utility Functions', () => {
  let mockSocket: Socket;

  beforeEach(() => {
    mockSocket = {
      emit: vi.fn(),
      on: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as Socket;
  });

  describe('sendMessage', () => {
    it('should emit chat_message event with message payload', () => {
      const message = 'Hello, bot!';
      
      sendMessage(mockSocket, message);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('chat_message', { message });
    });
  });

  describe('onBotResponse', () => {
    it('should register listener for bot_response event', () => {
      const callback = vi.fn();
      
      onBotResponse(mockSocket, callback);
      
      expect(mockSocket.on).toHaveBeenCalledWith('bot_response', callback);
    });
  });

  describe('onError', () => {
    it('should register listener for error event', () => {
      const callback = vi.fn();
      
      onError(mockSocket, callback);
      
      expect(mockSocket.on).toHaveBeenCalledWith('error', callback);
    });
  });

  describe('disconnect', () => {
    it('should call socket.disconnect()', () => {
      disconnect(mockSocket);
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});
