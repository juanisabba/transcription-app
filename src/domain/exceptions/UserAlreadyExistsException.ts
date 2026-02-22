import { ConflictError } from "../../shared/errors";

/**
 * Excepción de dominio que indica que ya existe un usuario registrado
 * con el mismo email en el contexto de autenticación.
 *
 * Se debe lanzar cuando un flujo de registro de usuario detecta que
 * el email proporcionado ya está asociado a otro usuario.
 * Extiende {@link ConflictError} (HTTP 409) para uso en handlers.
 */
export class UserAlreadyExistsException extends ConflictError {
  public override name = "UserAlreadyExistsException";

  /**
   * Crea una nueva instancia de `UserAlreadyExistsException`.
   *
   * @param email - Email del usuario que ya existe.
   */
  constructor(email: string) {
    super(`Ya existe un usuario con el email ${email}`);
  }
}

