import api from './api';


export interface SignupData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}


export async function signup(data: SignupData): Promise<{ success: boolean; userId: string }> {
  const response = await api.post('/auth/signup', data);
  return response.data;
}


export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await api.post('/auth/login', data);
  return response.data;
}


export async function refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
  const response = await api.post('/auth/refresh', { refreshToken });
  return response.data;
}


const authService = {
  signup,
  login,
  refreshToken,
};

export default authService;
