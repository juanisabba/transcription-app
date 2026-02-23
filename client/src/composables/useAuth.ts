import type { LoginRequest, RegisterRequest } from "~/src/types/auth.types";
import { authService } from "../services/auth.service";
import { getApiErrorMessage } from "../utils/errorUtils";

export const useAuth = () => {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  const router = useRouter();

  const login = async (credentials: LoginRequest) => {
    try {
      uiStore.setLoading(true);
      uiStore.clearMessages();

      const response = await authService.login(credentials);
      authStore.setAuth(response);
      uiStore.setSuccess("Inicio de sesión exitoso");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await router.push("/");
    } catch (error: unknown) {
      console.error("Error en login:", error);
      uiStore.setError(getApiErrorMessage(error, "Error al iniciar sesión"));
    } finally {
      uiStore.setLoading(false);
    }
  };

  const register = async (credentials: RegisterRequest) => {
    try {
      uiStore.setLoading(true);
      uiStore.clearMessages();

      const response = await authService.register(credentials);
      authStore.setAuth(response);
      uiStore.setSuccess("Registro exitoso");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await router.push("/");
    } catch (error: unknown) {
      console.error("Error en registro:", error);
      uiStore.setError(getApiErrorMessage(error, "Error al registrarse"));
    } finally {
      uiStore.setLoading(false);
    }
  };

  const logout = async () => {
    try {
      uiStore.setLoading(true);
      await authService.logout();
      authStore.logout();
      uiStore.setSuccess("Sesión cerrada");
      await router.push("/");
    } catch (error: unknown) {
      console.error("Error en logout:", error);
      uiStore.setError("Error al cerrar sesión");
      authStore.logout();
    } finally {
      uiStore.setLoading(false);
    }
  };

  return { login, register, logout };
};
