import { RegisterUserUC } from "../RegisterUserUC";
import { createMockUserRepository, createMockAuthService } from "../../../../../tests/mocks";
import { PasswordService } from "../../../../domain/services/PasswordService";
import type { RegisterUserDTO } from "../../../dto/auth";

describe("RegisterUserUC", () => {
  const mockUserRepository = createMockUserRepository();
  const mockAuthService = createMockAuthService();

  const mockPasswordService = new PasswordService();

  let useCase: RegisterUserUC;

  const validEmail = "user@example.com";
  const validPassword = "SecurePass1!";

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RegisterUserUC(
      mockUserRepository,
      mockAuthService,
      mockPasswordService,
    );
    // Real PasswordService.hash() throws; spy to return a hash for success paths
    jest.spyOn(mockPasswordService, "hash").mockReturnValue("hashed");
    jest.spyOn(mockPasswordService, "isStrongPassword").mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("happy path", () => {
    it("should register user successfully", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(undefined);
      mockAuthService.register.mockResolvedValue({ userId: "cognito-123" });
      mockAuthService.authenticateWithPassword.mockResolvedValue({
        accessToken: "access-token",
        idToken: "id-token",
        refreshToken: "refresh-token",
        expiresIn: 3600,
      });

      const request: RegisterUserDTO = {
        email: validEmail,
        password: validPassword,
      };

      const result = await useCase.execute(request);

      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty("userId");
      expect(typeof result.userId).toBe("string");
      expect(result.email).toBe(validEmail);
    });

    it("should return AuthResponseDTO with tokens", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(undefined);
      mockAuthService.register.mockResolvedValue({ userId: "cognito-123" });
      mockAuthService.authenticateWithPassword.mockResolvedValue({
        accessToken: "jwt-access",
        idToken: "jwt-id",
        refreshToken: "jwt-refresh",
        expiresIn: 3600,
      });

      const request: RegisterUserDTO = {
        email: validEmail,
        password: validPassword,
      };

      const result = await useCase.execute(request);

      expect(result).toHaveProperty("accessToken", "jwt-access");
      expect(result).toHaveProperty("idToken", "jwt-id");
      expect(result).toHaveProperty("refreshToken", "jwt-refresh");
      expect(result).toHaveProperty("userId");
      expect(result).toHaveProperty("email", validEmail);
      expect(result).toHaveProperty("expiresIn", 3600);
    });
  });

  describe("error cases", () => {
    it("should throw UserAlreadyExistsException if email exists", async () => {
      const existingUser = {
        id: "existing-id",
        email: validEmail,
        passwordHash: "hash",
        createdAt: new Date(),
      };
      mockUserRepository.findByEmail.mockResolvedValue(existingUser as never);

      const request: RegisterUserDTO = {
        email: validEmail,
        password: validPassword,
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "Ya existe un usuario con el email user@example.com",
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it("should throw ValidationError if email missing", async () => {
      const request: RegisterUserDTO = {
        email: "",
        password: validPassword,
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "El email y la contraseña son requeridos",
      );
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it("should throw ValidationError if password missing", async () => {
      const request: RegisterUserDTO = {
        email: validEmail,
        password: "",
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "El email y la contraseña son requeridos",
      );
    });

    it("should throw InvalidPasswordException if password too weak", async () => {
      jest.spyOn(mockPasswordService, "isStrongPassword").mockReturnValue(false);

      const request: RegisterUserDTO = {
        email: validEmail,
        password: "weak",
      };

      await expect(useCase.execute(request)).rejects.toThrow(
        "La contraseña no cumple los requisitos de seguridad",
      );
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });
});
