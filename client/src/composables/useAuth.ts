import type { LoginRequest, RegisterRequest } from "~/src/types/auth.types";
import { authService } from "../services/auth.service";

export const useAuth = () => {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  const router = useRouter();

  const login = async (credentials: LoginRequest) => {
    try {
      uiStore.setLoading(true);
      uiStore.clearMessages();

      console.log("Iniciando login con:", credentials.email);
      const response = await authService.login(credentials);

      console.log("Login exitoso:", response);
      authStore.setAuth(response);
      uiStore.setSuccess("Inicio de sesión exitoso");

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
    try {
      uiStore.setLoading(true);
      uiStore.clearMessages();

      console.log("Iniciando registro con:", credentials.email);
      const response = await authService.register(credentials);

      console.log("Registro exitoso:", response);
      authStore.setAuth(response);
      uiStore.setSuccess("Registro exitoso");

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
    try {
      uiStore.setLoading(true);
      await authService.logout();
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
