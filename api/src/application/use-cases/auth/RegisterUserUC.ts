import { User } from "@domain/entities/User";
import type { IUserRepository } from "@domain/repositories/IUserRepository";
import { PasswordService } from "@domain/services/PasswordService";
import {
  UserAlreadyExistsException,
  InvalidPasswordException,
} from "@domain/exceptions";
import type { IAuthService } from "@application/ports/IAuthService";
import type { RegisterUserDTO, AuthResponseDTO } from "@application/dto/auth";
import { v4 as uuid } from "uuid";

/**
 * Caso de uso responsable de registrar un nuevo usuario en el sistema.
 *
 * Orquesta la interacción entre la capa de dominio (entidad `User`,
 * `PasswordService`, `IUserRepository`) y la capa de infraestructura a través
 * del puerto `IAuthService` (por ejemplo, Cognito).
 */
export class RegisterUserUC {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authService: IAuthService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Ejecuta el flujo de registro de usuario.
   *
   * 1. Valida que el request contenga email y password.
   * 2. Verifica la fortaleza de la contraseña usando `PasswordService`.
   * 3. Comprueba que no exista ya un usuario con el mismo email.
   * 4. Hashea la contraseña.
   * 5. Crea la entidad de dominio `User`.
   * 6. Persiste el usuario en el repositorio.
   * 7. Registra el usuario en el proveedor de autenticación externo.
   * 8. Autentica al usuario para obtener los tokens de acceso.
   * 9. Retorna un `AuthResponseDTO` con la información necesaria para el frontend.
   *
   * @param request - Datos de registro del usuario.
   * @returns Promesa que se resuelve con los datos de autenticación del usuario recién registrado.
   * @throws ValidationError Si falta el email o la contraseña.
   * @throws InvalidPasswordException Si la contraseña no cumple los requisitos de seguridad.
   * @throws UserAlreadyExistsException Si ya existe un usuario con el email proporcionado.
   * @throws Error Propagará cualquier error lanzado por los servicios subyacentes.
   */
  public async execute(request: RegisterUserDTO): Promise<AuthResponseDTO> {
    const { email, password } = request;

    // Paso 1: Validar request
    if (!email || !password) {
      throw new ValidationError("El email y la contraseña son requeridos");
    }

    // Paso 2: Validar fortaleza de la contraseña
    const isStrongPassword: boolean =
      this.passwordService.isStrongPassword(password);
    if (!isStrongPassword) {
      throw new InvalidPasswordException(
        "La contraseña no cumple los requisitos de seguridad",
      );
    }

    // Paso 3: Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsException(email);
    }

    // Paso 4: Hashear la contraseña
    const passwordHash: string = this.passwordService.hash(password);

    // Paso 5: Crear entidad de usuario de dominio con ID generado
    // (en mock mode, authService.register no hace nada real, así que generamos el ID aquí)
    const userId = uuid();
    const now: Date = new Date();
    const user = new User(userId, email, passwordHash, now);

    // Paso 6: Guardar en base de datos
    await this.userRepository.save(user);

    // Paso 7: Registrar en servicio de autenticación externo (mock por ahora)
    await this.authService.register(email, password);

    // Paso 8: Autenticar para obtener tokens
    const tokens = await this.authService.authenticateWithPassword(
      email,
      password,
    );

    // Paso 9: Construir y retornar DTO de respuesta (idToken para API Gateway Authorizer)
    const response: AuthResponseDTO = {
      userId: user.id,
      email: user.email,
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };

    return response;
  }
}

/**
 * Error de validación utilizado para indicar que la petición de registro
 * no contiene los datos mínimos requeridos (por ejemplo, email o password).
 */
class ValidationError extends Error {
  public override name = "ValidationError";

  constructor(message: string) {
    super(message);
  }
}
