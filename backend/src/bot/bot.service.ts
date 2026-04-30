import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogService } from '../logging/log.service';
import { timeout, TimeoutStrategy } from 'cockatiel';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface HeuristicResponse {
  response: string;
  quickReplies: string[];
}

interface BotResponse {
  content: string;
  source: 'heuristic' | 'gemini' | 'fallback';
  quickReplies?: string[];
}

@Injectable()
export class BotService {
  private readonly heuristicMap: Record<string, HeuristicResponse> = {
    oi: {
      response: 'Olá! Como posso ajudar?',
      quickReplies: ['Como você funciona?', 'Preciso de ajuda', 'Encerrar'],
    },
    olá: {
      response: 'Olá! Como posso ajudar?',
      quickReplies: ['Como você funciona?', 'Preciso de ajuda', 'Encerrar'],
    },
    hey: {
      response: 'Oi! Em que posso ajudar?',
      quickReplies: ['Como você funciona?', 'Preciso de ajuda', 'Encerrar'],
    },
    'bom dia': {
      response: 'Bom dia! Como posso ajudar?',
      quickReplies: ['Preciso de ajuda', 'Informações gerais'],
    },
    'boa tarde': {
      response: 'Boa tarde! Em que posso ajudar?',
      quickReplies: ['Preciso de ajuda', 'Informações gerais'],
    },
    'boa noite': {
      response: 'Boa noite! Em que posso ajudar?',
      quickReplies: ['Preciso de ajuda', 'Informações gerais'],
    },
    ajuda: {
      response: 'Estou aqui para ajudar! O que você precisa?',
      quickReplies: ['Informações gerais', 'Falar com humano', 'Encerrar'],
    },
    help: {
      response: 'How can I help you?',
      quickReplies: ['General info', 'Talk to human', 'Exit'],
    },
    'como vai': {
      response: 'Vou muito bem, obrigado! E você?',
      quickReplies: ['Preciso de ajuda', 'Só passando', 'Encerrar'],
    },
    'tudo bem': {
      response: 'Tudo ótimo! Em que posso ajudar?',
      quickReplies: ['Preciso de ajuda', 'Só passando', 'Encerrar'],
    },
    obrigado: {
      response: 'De nada! Fico feliz em ajudar.',
      quickReplies: ['Mais alguma coisa?', 'Encerrar'],
    },
    obrigada: {
      response: 'De nada! Fico feliz em ajudar.',
      quickReplies: ['Mais alguma coisa?', 'Encerrar'],
    },
    tchau: {
      response: 'Até logo! Foi um prazer conversar.',
      quickReplies: [],
    },
    'até logo': {
      response: 'Tchau! Volte sempre.',
      quickReplies: [],
    },
  };

  private readonly fallbackResponses: HeuristicResponse[] = [
    {
      response: 'Desculpe, estou com muitas requisições no momento. Pode tentar novamente em alguns segundos?',
      quickReplies: ['Tentar novamente', 'Encerrar'],
    },
    {
      response: 'Entendo. Pode me contar mais sobre isso?',
      quickReplies: ['Reformular pergunta', 'Tentar novamente', 'Encerrar'],
    },
    {
      response: 'Interessante. Continue, estou ouvindo.',
      quickReplies: ['Reformular pergunta', 'Tentar novamente', 'Encerrar'],
    },
    {
      response: 'Hmm, deixe-me pensar nisso. Pode reformular sua pergunta?',
      quickReplies: ['Reformular pergunta', 'Tentar novamente', 'Encerrar'],
    },
  ];

  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly logService: LogService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey && apiKey.trim().length > 0) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  private checkHeuristics(message: string): HeuristicResponse | null {
    const normalized = message.toLowerCase().trim();
    
    if (normalized in this.heuristicMap) {
      return this.heuristicMap[normalized];
    }
    
    return null;
  }

  private getFallbackResponse(): HeuristicResponse {
    const randomIndex = Math.floor(
      Math.random() * this.fallbackResponses.length,
    );
    return this.fallbackResponses[randomIndex];
  }

  private async callGemini(message: string): Promise<string | null> {
    if (!this.genAI) {
      return null;
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-lite',
        systemInstruction: 'Você é um assistente virtual prestativo e amigável. Responda de forma clara, concisa e educada. Mantenha as respostas curtas (máximo 2-3 frases) e diretas ao ponto. Use um tom conversacional e natural.'
      });
      
      timeout(5000, TimeoutStrategy.Aggressive);

      const result = await model.generateContent(message)

      const response = result.response;
      const text = response.text();
      
      return text;
    } catch (error) {
      if (error.name === 'TaskCancelledError') {
        this.logService.warn('BotService', 'Gemini API timeout', {
          timeoutMs: 5000,
        });
      } else if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        this.logService.warn('BotService', 'Gemini API rate limit exceeded', {
          errorType: 'rate_limit',
        });
      } else {
        this.logService.warn('BotService', 'Gemini API call failed', {
          errorType: 'api_failure',
          error: error.message,
        });
      }
      return null;
    }
  }

  async generateResponse(
    message: string,
    context?: { userId: string; sessionId: string },
  ): Promise<BotResponse> {
    
    const heuristicResponse = this.checkHeuristics(message);
    if (heuristicResponse) {
      return {
        content: heuristicResponse.response,
        source: 'heuristic',
        quickReplies: heuristicResponse.quickReplies,
      };
    }

    
    const geminiResponse = await this.callGemini(message);
    if (geminiResponse) {
      return {
        content: geminiResponse,
        source: 'gemini',
      };
    }

    
    const fallbackResponse = this.getFallbackResponse();
    this.logService.info('BotService', 'Using fallback response', {
      userId: context?.userId,
    });

    return {
      content: fallbackResponse.response,
      source: 'fallback',
      quickReplies: fallbackResponse.quickReplies,
    };
  }
}
