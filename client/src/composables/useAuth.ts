import { authService } from "../services/auth.service";
import type { LoginRequest, RegisterRequest } from "../types/auth.types";
import { useApi } from "./useApi";
import { useAuthStore } from "../stores/auth.store";
import { useUiStore } from "../stores/ui.store";

export const useAuth = () => {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  const router = useRouter();

  const login = async (credentials: LoginRequest) => {
    const api = useApi();
    try {
      uiStore.setLoading(true);
      uiStore.clearMessages();

      console.log("Iniciando login con:", credentials.email);
      const response = await authService.login(api, credentials);

      console.log("Login exitoso:", response);
      authStore.setAuth(response);
      uiStore.setSuccess("Inicio de sesión exitoso");

      // Esperar un poco para que se vea el mensaje
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await router.push("/transcribe/upload");
    } catch (error: any) {
      console.error("Error en login:", error);
      const message =
        error.response?.data?.message || "Error al iniciar sesión";
      uiStore.setError(message);
    } finally {
      uiStore.setLoading(false);
    }
  };

  const register = async (credentials: RegisterRequest) => {
    const api = useApi();
    try {
      uiStore.setLoading(true);
      uiStore.clearMessages();

      console.log("Iniciando registro con:", credentials.email);
      const response = await authService.register(api, credentials);

      console.log("Registro exitoso:", response);
      authStore.setAuth(response);
      uiStore.setSuccess("Registro exitoso");

      // Esperar un poco para que se vea el mensaje
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await router.push("/transcribe/upload");
    } catch (error: any) {
      console.error("Error en registro:", error);
      const message = error.response?.data?.message || "Error al registrarse";
      uiStore.setError(message);
    } finally {
      uiStore.setLoading(false);
    }
  };

  const logout = async () => {
    const api = useApi();
    try {
      uiStore.setLoading(true);
      await authService.logout(api);
      authStore.logout();
      uiStore.setSuccess("Sesión cerrada");
      await router.push("/");
    } catch (error: any) {
      console.error("Error en logout:", error);
      uiStore.setError("Error al cerrar sesión");
      authStore.logout();
    } finally {
      uiStore.setLoading(false);
    }
  };

  return { login, register, logout };
};
