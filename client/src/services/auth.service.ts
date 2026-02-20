import type { AxiosInstance } from 'axios';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from '../types/auth.types';

export const authService = {
  login: async (
    api: AxiosInstance,
    credentials: LoginRequest,
  ): Promise<AuthResponse> => {
    try {
      console.log('API call: POST /auth/login');
      const { data } = await api.post<AuthResponse>('/auth/login', credentials);
      console.log('Response:', data);
      return data;
    } catch (error: any) {
      console.error('Auth service login error:', error);
      throw error;
    }
  },

  register: async (
    api: AxiosInstance,
    credentials: RegisterRequest,
  ): Promise<AuthResponse> => {
    try {
      console.log('API call: POST /auth/register');
      const { data } = await api.post<AuthResponse>(
        '/auth/register',
        credentials,
      );
      console.log('Response:', data);
      return data;
    } catch (error: any) {
      console.error('Auth service register error:', error);
      throw error;
    }
  },

  logout: async (api: AxiosInstance): Promise<void> => {
    try {
      console.log('API call: POST /auth/logout');
      await api.post('/auth/logout');
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Auth service logout error:', error);
      throw error;
    }
  },
};
