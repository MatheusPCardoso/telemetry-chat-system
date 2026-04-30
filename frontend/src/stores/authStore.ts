import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

interface AuthState {
  user: { id: string; email: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: { id: string; email: string }) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setTokens: (accessToken: string, refreshToken: string) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        try {
          const decoded = jwtDecode<JwtPayload>(accessToken);
          const user = { id: decoded.userId, email: decoded.email };
          
          set({ accessToken, refreshToken, user, isAuthenticated: true });
        } catch (error) {
          console.error('Failed to decode JWT:', error);
          set({ accessToken, refreshToken, isAuthenticated: true });
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: { id: string; email: string }) => {
        set({ user });
      },

      hydrate: () => {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (accessToken && refreshToken) {
          try {
            const decoded = jwtDecode<JwtPayload>(accessToken);
            const user = { id: decoded.userId, email: decoded.email };
            
            set({ accessToken, refreshToken, user, isAuthenticated: true });
          } catch (error) {
            console.error('Failed to decode JWT during hydration:', error);
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
