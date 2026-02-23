import { IUserRepository } from '../../../../api/src/domain/repositories/IUserRepository';
import { IAuthService } from '../../ports/IAuthService';
import { LoginUserDTO, AuthResponseDTO } from '../../dto/auth';

/**
 * Caso de uso responsable de autenticar a un usuario existente en el sistema.
 *
 * Orquesta la interacción entre la capa de aplicación (DTOs), la capa de
 * dominio (`IUserRepository`) y el proveedor de autenticación externo a
 * través del puerto `IAuthService` (por ejemplo, Cognito).
 *
 * A diferencia de `RegisterUserUC`, este caso de uso es más simple:
 * solo valida la petición, autentica al usuario y construye la respuesta
 * con los tokens de acceso.
 */
export class LoginUserUC {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly authService: IAuthService,
  ) {}

  /**
   * Ejecuta el flujo de inicio de sesión de un usuario.
   *
   * 1. Valida que el request contenga email y password.
   * 2. Autentica al usuario contra el servicio de autenticación externo.
   * 3. Obtiene el `userId` validando el access token devuelto.
   * 4. Intenta actualizar último login en el repositorio (opcional en mock mode).
   * 5. Retorna un `AuthResponseDTO` con la información necesaria para el frontend.
   *
   * En modo mock o cuando el usuario no existe en BD, el flujo completa
   * sin requerir que el usuario exista en el repositorio de dominio.
   *
   * @param request - Datos de login del usuario.
   * @returns Promesa que se resuelve con los datos de autenticación del usuario.
   *
   * @throws ValidationError Si falta el email o la contraseña.
   * @throws InvalidCredentialsException Si las credenciales no son válidas
   *         (lanzado por la implementación de `IAuthService`).
   */
  public async execute(request: LoginUserDTO): Promise<AuthResponseDTO> {
    const { email, password } = request;

    // Paso 1: Validar request
    if (!email || !password) {
      throw new ValidationError("El email y la contraseña son requeridos");
    }

    // Paso 2: Autenticar con el servicio externo (p. ej. Cognito o mock)
    const tokens = await this.authService.authenticateWithPassword(
      email,
      password,
    );

    // Paso 3: Obtener el userId validando el access token
    const tokenInfo = await this.authService.validateToken(tokens.accessToken);
    const userId = tokenInfo.sub;

    // Paso 4: Intentar actualizar último login (opcional; puede fallar en mock mode)
    try {
      await this.userRepository.updateLastLogin(userId);
    } catch {
      // Ignorar si el usuario no existe en BD (e.g. modo mock, login sin registro previo)
    }

    // Paso 5: Retornar respuesta (idToken para API Gateway Authorizer, accessToken para logout)
    return {
      userId,
      email,
      accessToken: tokens.accessToken,
      idToken: tokens.idToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }
}

/**
 * Error de validación utilizado para indicar que la petición de inicio
 * de sesión no contiene los datos mínimos requeridos (por ejemplo,
 * email o password).
 *
 * Se define localmente en este archivo hasta que exista una implementación
 * compartida en la capa `shared/errors`.
 */
class ValidationError extends Error {
  public override name = 'ValidationError';

  constructor(message: string) {
    super(message);
  }
}
