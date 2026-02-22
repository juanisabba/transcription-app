import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "./auth.store";

describe("auth.store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  });

  it("inicialmente no está autenticado", () => {
    const store = useAuthStore();
    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(store.email).toBeNull();
  });

  it("setAuth actualiza user y token", () => {
    const store = useAuthStore();
    const response = {
      userId: "user-123",
      email: "test@example.com",
      accessToken: "jwt-token-xyz",
    };

    store.setAuth(response);

    expect(store.isAuthenticated).toBe(true);
    expect(store.token).toBe("jwt-token-xyz");
    expect(store.user?.email).toBe("test@example.com");
    expect(store.user?.userId).toBe("user-123");
    expect(store.email).toBe("test@example.com");
  });

  it("logout limpia el estado", () => {
    const store = useAuthStore();
    store.setAuth({
      userId: "user-123",
      email: "test@example.com",
      accessToken: "token",
    });

    store.logout();

    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
  });
});
