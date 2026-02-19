import { ValidationError } from "../../shared/errors";

/**
 * Excepción de dominio que indica que el formato del email proporcionado
 * es inválido dentro del contexto de autenticación.
 *
 * Se debe lanzar cuando se valida un email de entrada (por ejemplo, en un
 * caso de uso de registro o login) y no cumple con el formato esperado.
 * Extiende {@link ValidationError} (HTTP 400) para uso en handlers.
 */
export class InvalidEmailException extends ValidationError {
  public override name = "InvalidEmailException";

  /**
   * Crea una nueva instancia de `InvalidEmailException`.
   *
   * @param email - Email con formato inválido.
   */
  constructor(email: string) {
    super(`Invalid email format: ${email}`);
  }
}

