import { defineStore } from 'pinia';
import type { User, AuthResponse } from '../types/auth.types';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  // idToken: usado en Authorization para endpoints protegidos (requerido por Cognito Authorizer)
  const token = ref<string | null>(
    import.meta.client ? localStorage.getItem('token') : null,
  );
  // accessToken: usado solo para logout (GlobalSignOut requiere AccessToken)
  const accessToken = ref<string | null>(
    import.meta.client ? localStorage.getItem('accessToken') : null,
  );

  // Computed
  const isAuthenticated = computed(() => !!token.value);
  const email = computed(() => user.value?.email ?? null);

  // Actions - idToken para API Gateway Cognito Authorizer; accessToken para logout
  const setAuth = (response: AuthResponse) => {
    user.value = {
      userId: response.userId,
      email: response.email,
    };
    token.value = response.idToken;
    accessToken.value = response.accessToken;
    if (import.meta.client) {
      localStorage.setItem('token', response.idToken);
      localStorage.setItem('accessToken', response.accessToken);
    }
  };

  const logout = () => {
    user.value = null;
    token.value = null;
    accessToken.value = null;
    if (import.meta.client) {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
    }
  };

  const restore = () => {
    if (import.meta.client && !token.value) {
      const storedToken = localStorage.getItem('token');
      const storedAccessToken = localStorage.getItem('accessToken');
      if (storedToken) token.value = storedToken;
      if (storedAccessToken) accessToken.value = storedAccessToken;
    }
  };

  return {
    user,
    token,
    accessToken,
    isAuthenticated,
    email,
    setAuth,
    logout,
    restore,
  };
});
