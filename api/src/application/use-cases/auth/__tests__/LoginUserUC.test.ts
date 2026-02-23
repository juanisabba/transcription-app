import { LoginUserUC } from "../LoginUserUC";
import { createMockUserRepository, createMockAuthService } from "../../../../../../tests/mocks";
import type { LoginUserDTO } from "../../../dto/auth";

describe("LoginUserUC", () => {
  const mockUserRepository = createMockUserRepository();
  const mockAuthService = createMockAuthService();

  let useCase: LoginUserUC;

  const validEmail = "user@example.com";
  const validPassword = "SecurePass1!";

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new LoginUserUC(mockUserRepository, mockAuthService);
  });

  describe("happy path", () => {
    it("should return AuthResponseDTO with tokens on successful login", async () => {
      mockAuthService.authenticateWithPassword.mockResolvedValue({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      });
      mockAuthService.validateToken.mockResolvedValue({
        sub: "user-id-123",
        email: validEmail,
      });
      mockUserRepository.updateLastLogin.mockResolvedValue(undefined);

      const request: LoginUserDTO = { email: validEmail, password: validPassword };
      const result = await useCase.execute(request);

      expect(result.userId).toBe("user-id-123");
      expect(result.email).toBe(validEmail);
      expect(result.accessToken).toBe("access-token");
      expect(result.idToken).toBe("id-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(result.expiresIn).toBe(3600);
    });

    it("should complete login even if updateLastLogin fails (mock mode)", async () => {
      mockAuthService.authenticateWithPassword.mockResolvedValue({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      });
      mockAuthService.validateToken.mockResolvedValue({
        sub: "user-id-123",
        email: validEmail,
      });
      mockUserRepository.updateLastLogin.mockRejectedValue(new Error("User not found in DB"));

      const request: LoginUserDTO = { email: validEmail, password: validPassword };
      const result = await useCase.execute(request);

      expect(result.userId).toBe("user-id-123");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError if email is missing", async () => {
      const request: LoginUserDTO = { email: "", password: validPassword };
      await expect(useCase.execute(request)).rejects.toThrow(
        "El email y la contraseña son requeridos"
      );
      expect(mockAuthService.authenticateWithPassword).not.toHaveBeenCalled();
    });

    it("should throw ValidationError if password is missing", async () => {
      const request: LoginUserDTO = { email: validEmail, password: "" };
      await expect(useCase.execute(request)).rejects.toThrow(
        "El email y la contraseña son requeridos"
      );
      expect(mockAuthService.authenticateWithPassword).not.toHaveBeenCalled();
    });

    it("should propagate authentication errors from authService", async () => {
      mockAuthService.authenticateWithPassword.mockRejectedValue(
        new Error("Email o contraseña inválidos")
      );

      const request: LoginUserDTO = { email: validEmail, password: "wrongpass" };
      await expect(useCase.execute(request)).rejects.toThrow(
        "Email o contraseña inválidos"
      );
    });
  });
});
