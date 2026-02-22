import { describe, it, expect, vi, beforeEach } from "vitest";
import { authService } from "./auth.service";

vi.mock("./api", () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from "./api";

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("login llama POST /auth/login con credenciales", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        userId: "user-1",
        email: "test@example.com",
        accessToken: "token-xyz",
      },
    });

    const result = await authService.login({
      email: "test@example.com",
      password: "Pass123!",
    });

    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      email: "test@example.com",
      password: "Pass123!",
    });
    expect(result).toEqual({
      userId: "user-1",
      email: "test@example.com",
      accessToken: "token-xyz",
    });
  });

  it("register llama POST /auth/register con credenciales", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        userId: "user-2",
        email: "new@example.com",
        accessToken: "token-abc",
      },
    });

    const result = await authService.register({
      email: "new@example.com",
      password: "Pass123!",
    });

    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      email: "new@example.com",
      password: "Pass123!",
    });
    expect(result.userId).toBe("user-2");
  });

  it("logout llama POST /auth/logout", async () => {
    vi.mocked(api.post).mockResolvedValue({});

    await authService.logout();

    expect(api.post).toHaveBeenCalledWith("/auth/logout");
  });

  it("login propaga errores", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Network error"));

    await expect(
      authService.login({ email: "x@x.com", password: "x" })
    ).rejects.toThrow("Network error");
  });
});
