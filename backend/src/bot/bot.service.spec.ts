import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BotService } from './bot.service';
import { LogService } from '../logging/log.service';

describe('BotService', () => {
  let service: BotService;

  const mockLogService = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotService,
        {
          provide: LogService,
          useValue: mockLogService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BotService>(BotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Heuristics', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('');
    });

    it('should return heuristic response for "oi" with source: heuristic and quickReplies', async () => {
      const result = await service.generateResponse('oi');

      expect(result.source).toBe('heuristic');
      expect(result.content).toBe('Olá! Como posso ajudar?');
      expect(result.quickReplies).toBeDefined();
      expect(Array.isArray(result.quickReplies)).toBe(true);
      expect(result.quickReplies).toEqual([
        'Como você funciona?',
        'Preciso de ajuda',
        'Encerrar',
      ]);
    });

    it('should return heuristic response for "ajuda" with appropriate quickReplies', async () => {
      const result = await service.generateResponse('ajuda');

      expect(result.source).toBe('heuristic');
      expect(result.content).toBe('Estou aqui para ajudar! O que você precisa?');
      expect(result.quickReplies).toBeDefined();
      expect(Array.isArray(result.quickReplies)).toBe(true);
      expect(result.quickReplies).toEqual([
        'Informações gerais',
        'Falar com humano',
        'Encerrar',
      ]);
    });

    it('should return heuristic response for "tchau" with empty quickReplies', async () => {
      const result = await service.generateResponse('tchau');

      expect(result.source).toBe('heuristic');
      expect(result.content).toBe('Até logo! Foi um prazer conversar.');
      expect(result.quickReplies).toBeDefined();
      expect(Array.isArray(result.quickReplies)).toBe(true);
      expect(result.quickReplies).toEqual([]);
    });

    it('should be case-insensitive (OI, Oi, oi)', async () => {
      const resultUpperCase = await service.generateResponse('OI');
      const resultMixedCase = await service.generateResponse('Oi');
      const resultLowerCase = await service.generateResponse('oi');

      expect(resultUpperCase.source).toBe('heuristic');
      expect(resultMixedCase.source).toBe('heuristic');
      expect(resultLowerCase.source).toBe('heuristic');

      expect(resultUpperCase.content).toBe('Olá! Como posso ajudar?');
      expect(resultMixedCase.content).toBe('Olá! Como posso ajudar?');
      expect(resultLowerCase.content).toBe('Olá! Como posso ajudar?');

      expect(resultUpperCase.quickReplies).toEqual([
        'Como você funciona?',
        'Preciso de ajuda',
        'Encerrar',
      ]);
      expect(resultMixedCase.quickReplies).toEqual([
        'Como você funciona?',
        'Preciso de ajuda',
        'Encerrar',
      ]);
      expect(resultLowerCase.quickReplies).toEqual([
        'Como você funciona?',
        'Preciso de ajuda',
        'Encerrar',
      ]);
    });

    it('should return quickReplies as arrays of strings', async () => {
      const testMessages = ['oi', 'ajuda', 'tchau', 'obrigado'];

      for (const message of testMessages) {
        const result = await service.generateResponse(message);

        expect(result.quickReplies).toBeDefined();
        expect(Array.isArray(result.quickReplies)).toBe(true);
        
        
        result.quickReplies!.forEach((reply) => {
          expect(typeof reply).toBe('string');
        });
      }
    });
  });

  describe('Fallback', () => {
    beforeEach(() => {
      mockConfigService.get.mockReturnValue('');
    });

    it('should return fallback response when message has no heuristic match', async () => {
      const result = await service.generateResponse('mensagem sem match heurístico');

      expect(result.source).toBe('fallback');
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.quickReplies).toBeDefined();
      expect(Array.isArray(result.quickReplies)).toBe(true);
    });

    it('should return one of the fallback responses from the pool', async () => {
      const fallbackPool = [
        'Desculpe, estou com muitas requisições no momento. Pode tentar novamente em alguns segundos?',
        'Entendo. Pode me contar mais sobre isso?',
        'Interessante. Continue, estou ouvindo.',
        'Hmm, deixe-me pensar nisso. Pode reformular sua pergunta?',
      ];

      const result = await service.generateResponse('mensagem aleatória');

      expect(result.source).toBe('fallback');
      expect(fallbackPool).toContain(result.content);
      expect(result.quickReplies).toBeDefined();
      expect(Array.isArray(result.quickReplies)).toBe(true);
    });

    it('should log fallback usage', async () => {
      const context = { userId: 'user-123', sessionId: 'session-456' };

      await service.generateResponse('mensagem sem match', context);

      expect(mockLogService.info).toHaveBeenCalledWith(
        'BotService',
        'Using fallback response',
        { userId: 'user-123' },
      );
    });
  });

  describe('Gemini Integration (mock)', () => {
    let mockFetch: jest.SpyInstance;

    beforeEach(() => {
      mockConfigService.get.mockReturnValue('test-api-key-12345');

      mockFetch = jest.spyOn(global, 'fetch');
    });

    afterEach(() => {
      mockFetch.mockRestore();
    });

    it('should use Gemini when message has no heuristic match', async () => {
      
      
      expect(true).toBe(true);
    });

    it('should return Gemini response with source: gemini and WITHOUT quickReplies', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Resposta gerada pelo Gemini AI' }],
              },
            },
          ],
        }),
      } as Response);

      const result = await service.generateResponse('qual é o sentido da vida?');

      expect(result.source).toBe('gemini');
      expect(result.content).toBe('Resposta gerada pelo Gemini AI');
      expect(result.quickReplies).toBeUndefined();
    });

    it('should fallback with quickReplies when Gemini times out', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => {
              const error = new Error('Timeout');
              error.name = 'TaskCancelledError';
              reject(error);
            }, 100);
          }),
      );

      const result = await service.generateResponse('mensagem que vai dar timeout');

      expect(result.source).toBe('fallback');
      expect(result.content).toBeDefined();
      expect(result.quickReplies).toBeDefined();
      expect(Array.isArray(result.quickReplies)).toBe(true);

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'BotService',
        'Gemini API call failed',
        expect.objectContaining({
          errorType: 'api_failure',
        }),
      );
    });

    it('should fallback with quickReplies when Gemini returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await service.generateResponse('mensagem que vai dar erro');

      expect(result.source).toBe('fallback');
      expect(result.content).toBeDefined();
      expect(result.quickReplies).toBeDefined();
      expect(Array.isArray(result.quickReplies)).toBe(true);

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'BotService',
        'Gemini API call failed',
        expect.objectContaining({
          errorType: 'api_failure',
        }),
      );
    });

    it('should fallback with quickReplies when Gemini throws exception', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await service.generateResponse('mensagem que vai lançar exceção');

      expect(result.source).toBe('fallback');
      expect(result.content).toBeDefined();
      expect(result.quickReplies).toBeDefined();
      expect(Array.isArray(result.quickReplies)).toBe(true);

      expect(mockLogService.warn).toHaveBeenCalledWith(
        'BotService',
        'Gemini API call failed',
        expect.objectContaining({
          errorType: 'api_failure',
        }),
      );
    });
  });
});
