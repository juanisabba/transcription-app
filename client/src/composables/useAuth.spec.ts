import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuth } from "./useAuth";

const mockPush = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("../services/auth.service", () => ({
  authService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authService } from "../services/auth.service";

describe("useAuth", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("login llama authService.login y actualiza el store en éxito", async () => {
    const mockResponse = {
      userId: "user-1",
      email: "test@example.com",
      accessToken: "token-xyz",
    };
    vi.mocked(authService.login).mockResolvedValue(mockResponse);

    const { login } = useAuth();
    const authStore = useAuthStore();
    const uiStore = useUiStore();

    await login({ email: "test@example.com", password: "Pass123!" });

    expect(authService.login).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "Pass123!",
    });
    expect(authStore.token).toBe("token-xyz");
    expect(authStore.user?.email).toBe("test@example.com");
    expect(uiStore.successMessage).toBe("Inicio de sesión exitoso");
  });

  it("login actualiza error en el store cuando falla", async () => {
    vi.mocked(authService.login).mockRejectedValue({
      response: { data: { message: "Credenciales inválidas" } },
    });

    const { login } = useAuth();
    const authStore = useAuthStore();
    const uiStore = useUiStore();

    await login({ email: "bad@example.com", password: "wrong" });

    expect(authStore.token).toBeNull();
    expect(uiStore.error).toBe("Credenciales inválidas");
  });

  it("register llama authService.register y actualiza el store en éxito", async () => {
    const mockResponse = {
      userId: "user-2",
      email: "new@example.com",
      accessToken: "token-abc",
    };
    vi.mocked(authService.register).mockResolvedValue(mockResponse);

    const { register } = useAuth();
    const authStore = useAuthStore();

    await register({ email: "new@example.com", password: "Pass123!" });

    expect(authService.register).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "Pass123!",
    });
    expect(authStore.token).toBe("token-abc");
  });

  it("logout llama authService.logout y limpia el store", async () => {
    const authStore = useAuthStore();
    authStore.setAuth({
      userId: "user-1",
      email: "test@example.com",
      accessToken: "token",
    });
    vi.mocked(authService.logout).mockResolvedValue(undefined);

    const { logout } = useAuth();

    await logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(authStore.token).toBeNull();
  });
});
