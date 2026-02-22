import axios from "axios";
import type { AxiosInstance } from "axios";

const config = useRuntimeConfig();

const api: AxiosInstance = axios.create({
  baseURL: config.public.apiUrl,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: agregar token en cada request
api.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// Interceptor: manejar errores
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const err = error as { response?: { status?: number } };
    if (err.response?.status === 401) {
      const authStore = useAuthStore();
      authStore.logout();
      navigateTo("/auth/login");
    }
    return Promise.reject(error);
  },
);

export default api;
