import { defineStore } from 'pinia';

export interface UiState {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

export const useUiStore = defineStore('ui', () => {
  // State
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const successMessage = ref<string | null>(null);

  // Actions
  const setLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const setError = (message: string | null) => {
    error.value = message;
    if (message) {
      setTimeout(() => {
        error.value = null;
      }, 5000); // Auto-clear después de 5 segundos
    }
  };

  const setSuccess = (message: string | null) => {
    successMessage.value = message;
    if (message) {
      setTimeout(() => {
        successMessage.value = null;
      }, 3000); // Auto-clear después de 3 segundos
    }
  };

  const clearMessages = () => {
    error.value = null;
    successMessage.value = null;
  };

  return {
    isLoading,
    error,
    successMessage,
    setLoading,
    setError,
    setSuccess,
    clearMessages,
  };
});
