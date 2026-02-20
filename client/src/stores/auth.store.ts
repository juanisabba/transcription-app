import { defineStore } from 'pinia';
import type { User, AuthResponse } from '../types/auth.types';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const token = ref<string | null>(
    import.meta.client ? localStorage.getItem('token') : null,
  );

  // Computed
  const isAuthenticated = computed(() => !!token.value);
  const email = computed(() => user.value?.email ?? null);

  // Actions
  const setAuth = (response: AuthResponse) => {
    user.value = {
      userId: response.userId,
      email: response.email,
    };
    token.value = response.accessToken;
    if (import.meta.client) {
      localStorage.setItem('token', response.accessToken);
    }
  };

  const logout = () => {
    user.value = null;
    token.value = null;
    if (import.meta.client) {
      localStorage.removeItem('token');
    }
  };

  const restore = () => {
    // Restaurar token desde localStorage al iniciar app
    if (import.meta.client && !token.value) {
      const stored = localStorage.getItem('token');
      if (stored) {
        token.value = stored;
      }
    }
  };

  return {
    user,
    token,
    isAuthenticated,
    email,
    setAuth,
    logout,
    restore,
  };
});
