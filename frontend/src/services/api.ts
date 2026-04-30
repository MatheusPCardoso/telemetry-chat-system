import axios from 'axios';
import { useAuthStore } from '../stores/authStore';


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});


api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    
    if (token) {
      
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 60;
      throw new Error(
        `Muitas tentativas. Aguarde ${retryAfter} segundos antes de tentar novamente.`
      );
    }

    
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      if (originalRequest.url?.includes('/auth/refresh')) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken }
        );

        const { accessToken: newAccessToken } = response.data;

        
        useAuthStore.getState().setTokens(newAccessToken, refreshToken);

        
        processQueue(null, newAccessToken);

        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
