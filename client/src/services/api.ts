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
api.interceptors.request.use((reqConfig) => {
  const authStore = useAuthStore();
  const isLogout =
    typeof reqConfig.url === "string" && reqConfig.url.includes("/auth/logout");
  // Logout requiere accessToken (GlobalSignOut); resto usa idToken (Cognito Authorizer)
  const token = isLogout
    ? authStore.accessToken ?? (import.meta.client ? localStorage.getItem("accessToken") : null)
    : authStore.token ?? (import.meta.client ? localStorage.getItem("token") : null);
  if (token) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  // En local (serverless-offline): fallback X-User-Id cuando el authorizer no inyecta claims
  const isLocalApi = config.public.apiUrl?.includes("localhost");
  if (isLocalApi && authStore.user?.userId) {
    reqConfig.headers["X-User-Id"] = authStore.user.userId;
  }
  if (reqConfig.data instanceof FormData) {
    delete reqConfig.headers["Content-Type"];
  }
  return reqConfig;
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
