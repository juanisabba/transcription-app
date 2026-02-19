import { ValidationError } from "../../shared/errors";

/**
 * Excepción de dominio que indica que la contraseña proporcionada
 * no cumple con los requisitos mínimos de seguridad definidos por
 * el dominio de autenticación.
 *
 * Se debe lanzar cuando, durante un registro o cambio de contraseña,
 * la password no respeta políticas como longitud mínima, complejidad,
 * historial, etc.
 * Extiende {@link ValidationError} (HTTP 400) para uso en handlers.
 */
export class InvalidPasswordException extends ValidationError {
  public override name = "InvalidPasswordException";

  /**
   * Crea una nueva instancia de `InvalidPasswordException`.
   *
   * @param reason - Motivo específico por el cual la contraseña es inválida.
   */
  constructor(
    reason: string = "Password does not meet security requirements",
  ) {
    super(reason);
  }
}

