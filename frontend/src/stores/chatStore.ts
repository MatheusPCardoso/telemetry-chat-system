import { create } from 'zustand';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  source?: 'heuristic' | 'gemini' | 'fallback';
  quickReplies?: string[];
}

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  sessionId: string | null;
}

interface ChatActions {
  addMessage: (message: Omit<Message, 'id'>) => void;
  setConnected: (connected: boolean) => void;
  setTyping: (typing: boolean) => void;
  setSessionId: (sessionId: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState & ChatActions>()((set) => ({
  messages: [],
  isConnected: false,
  isTyping: false,
  sessionId: null,

  addMessage: (message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
    };
    
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected });
  },

  setTyping: (typing: boolean) => {
    set({ isTyping: typing });
  },

  setSessionId: (sessionId: string) => {
    set({ sessionId });
  },

  clearMessages: () => {
    set({ messages: [] });
  },
}));
