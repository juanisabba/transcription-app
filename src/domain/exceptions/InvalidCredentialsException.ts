import { UnauthorizedError } from "../../shared/errors";

/**
 * Excepción de dominio que indica que las credenciales proporcionadas
 * (email y/o contraseña) son inválidas en un intento de autenticación.
 *
 * Se debe lanzar cuando un flujo de login falla porque la combinación
 * de email y contraseña no corresponde a ningún usuario válido.
 * Extiende {@link UnauthorizedError} (HTTP 401) para uso en handlers.
 */
export class InvalidCredentialsException extends UnauthorizedError {
  public override name = "InvalidCredentialsException";

  /**
   * Crea una nueva instancia de `InvalidCredentialsException`.
   */
  constructor() {
    super("Invalid email or password");
  }
}

