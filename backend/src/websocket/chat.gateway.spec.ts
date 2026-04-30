import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogService } from '../logging/log.service';
import { BotService } from '../bot/bot.service';
import { Socket } from 'socket.io';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let jwtService: JwtService;
  let logService: LogService;
  let botService: BotService;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    
    const mockJwtService = {
      verify: jest.fn(),
    };

    
    const mockLogService = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    
    const mockBotService = {
      generateResponse: jest.fn(),
    };

    
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'CORS_ORIGIN') return 'http://localhost:5173';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: LogService,
          useValue: mockLogService,
        },
        {
          provide: BotService,
          useValue: mockBotService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    jwtService = module.get<JwtService>(JwtService);
    logService = module.get<LogService>(LogService);
    botService = module.get<BotService>(BotService);

    
    mockClient = {
      id: 'test-client-id',
      data: {},
      handshake: {
        auth: {},
        headers: {},
      } as any,
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('Authentication', () => {
    it('should disconnect client when no token is provided', () => {
      
      mockClient.handshake = {
        auth: {},
        headers: {},
      } as any;

      
      gateway.handleConnection(mockClient as Socket);

      
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client when token is invalid', () => {
      
      mockClient.handshake = {
        auth: { token: 'invalid-token' },
        headers: {},
      } as any;

      
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      
      gateway.handleConnection(mockClient as Socket);

      
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it('should store userId and sessionId in client.data when token is valid', () => {
      
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      mockClient.handshake = {
        auth: { token: 'valid-token', sessionId: 'session-456' },
        headers: {},
      } as any;

      
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      
      gateway.handleConnection(mockClient as Socket);

      
      expect(mockClient.data.userId).toBe('user-123');
      expect(mockClient.data.sessionId).toBe('session-456');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should use client.id as fallback when sessionId is not provided', () => {
      
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      mockClient.handshake = {
        auth: { token: 'valid-token' },
        headers: {},
      } as any;

      
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      
      gateway.handleConnection(mockClient as Socket);

      
      expect(mockClient.data.sessionId).toBe('test-client-id');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should log connection event with userId and sessionId on successful connection', () => {
      
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      mockClient.handshake = {
        auth: { token: 'valid-token', sessionId: 'session-456' },
        headers: {},
      } as any;

      
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      
      gateway.handleConnection(mockClient as Socket);

      
      expect(logService.info).toHaveBeenCalledWith(
        'ChatGateway',
        'Client connected',
        {
          userId: 'user-123',
          sessionId: 'session-456',
          clientId: 'test-client-id',
        },
      );
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      
      mockClient.data = {
        userId: 'user-123',
        sessionId: 'session-456',
      };
    });

    it('should emit error when message is empty', async () => {
      
      const messageData = { message: '' };

      
      await gateway.handleMessage(messageData, mockClient as Socket);

      
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Message cannot be empty',
      });
      expect(botService.generateResponse).not.toHaveBeenCalled();
    });

    it('should emit error when message is only whitespace', async () => {
      
      const messageData = { message: '   ' };

      
      await gateway.handleMessage(messageData, mockClient as Socket);

      
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Message cannot be empty',
      });
      expect(botService.generateResponse).not.toHaveBeenCalled();
    });

    it('should call BotService.generateResponse with userId and sessionId for valid message', async () => {
      
      const messageData = { message: 'Hello bot' };
      const mockResponse = {
        content: 'Hello! How can I help you?',
        source: 'heuristic' as const,
        quickReplies: ['Tell me more', 'Help'],
      };

      (botService.generateResponse as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      
      await gateway.handleMessage(messageData, mockClient as Socket);

      
      expect(botService.generateResponse).toHaveBeenCalledWith('Hello bot', {
        userId: 'user-123',
        sessionId: 'session-456',
      });
    });

    it('should emit bot_response with content and quickReplies when present', async () => {
      
      const messageData = { message: 'Hello bot' };
      const mockResponse = {
        content: 'Hello! How can I help you?',
        source: 'heuristic' as const,
        quickReplies: ['Tell me more', 'Help'],
      };

      (botService.generateResponse as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      
      await gateway.handleMessage(messageData, mockClient as Socket);

      
      expect(mockClient.emit).toHaveBeenCalledWith(
        'bot_response',
        expect.objectContaining({
          content: 'Hello! How can I help you?',
          source: 'heuristic',
          quickReplies: ['Tell me more', 'Help'],
          timestamp: expect.any(String),
        }),
      );
    });

    it('should emit bot_response without quickReplies when not present', async () => {
      
      const messageData = { message: 'What is the weather?' };
      const mockResponse = {
        content: 'I cannot check the weather right now.',
        source: 'fallback' as const,
      };

      (botService.generateResponse as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      
      await gateway.handleMessage(messageData, mockClient as Socket);

      
      expect(mockClient.emit).toHaveBeenCalledWith(
        'bot_response',
        expect.objectContaining({
          content: 'I cannot check the weather right now.',
          source: 'fallback',
          quickReplies: undefined,
          timestamp: expect.any(String),
        }),
      );
    });

    it('should emit error when BotService throws exception', async () => {
      
      const messageData = { message: 'Hello bot' };

      (botService.generateResponse as jest.Mock).mockRejectedValue(
        new Error('Bot service error'),
      );

      
      await gateway.handleMessage(messageData, mockClient as Socket);

      
      expect(mockClient.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to process message',
      });
      expect(logService.error).toHaveBeenCalledWith(
        'ChatGateway',
        'Error processing message',
        {
          userId: 'user-123',
          errorType: 'processing_error',
        },
      );
    });

    it('should log message received with userId and sessionId', async () => {
      
      const messageData = { message: 'Hello bot' };
      const mockResponse = {
        content: 'Hello!',
        source: 'heuristic' as const,
      };

      (botService.generateResponse as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      
      await gateway.handleMessage(messageData, mockClient as Socket);

      
      expect(logService.info).toHaveBeenCalledWith(
        'ChatGateway',
        'Message received',
        {
          userId: 'user-123',
          sessionId: 'session-456',
          messageLength: 9,
        },
      );
    });

    it('should log response generated with userId, sessionId, and source', async () => {
      
      const messageData = { message: 'Hello bot' };
      const mockResponse = {
        content: 'Hello!',
        source: 'gemini' as const,
      };

      (botService.generateResponse as jest.Mock).mockResolvedValue(
        mockResponse,
      );

      
      await gateway.handleMessage(messageData, mockClient as Socket);

      
      expect(logService.info).toHaveBeenCalledWith(
        'ChatGateway',
        'Response generated',
        {
          userId: 'user-123',
          sessionId: 'session-456',
          source: 'gemini',
        },
      );
    });
  });
});
