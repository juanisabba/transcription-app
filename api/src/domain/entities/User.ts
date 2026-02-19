/**
 * Entidad de dominio que representa a un usuario registrado en Vocali.
 *
 * - Es **inmutable**: sus propiedades son `readonly`.
 * - Guarda únicamente `passwordHash` (nunca contraseña en texto plano).
 * - No depende de infraestructura ni librerías externas (Hexagonal Architecture).
 */
export class User {
  public readonly id: string;
  public readonly email: string;
  public readonly passwordHash: string;
  public readonly createdAt: Date;

  /**
   * Crea una nueva instancia de `User`.
   *
   * @param id - Identificador único del usuario (UUID).
   * @param email - Email del usuario.
   * @param passwordHash - Hash de la contraseña (nunca texto plano).
   * @param createdAt - Fecha y hora de registro.
   */
  constructor(id: string, email: string, passwordHash: string, createdAt: Date) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
  }

  /**
   * Valida una contraseña en texto plano contra `passwordHash`.
   *
   * Nota: La implementación concreta vive en `PasswordService` (p.ej. usando
   * `bcrypt.compare(plainPassword, this.passwordHash)`), para mantener el
   * dominio libre de dependencias externas.
   *
   * @param plainPassword - Contraseña en texto plano a validar.
   * @returns `true` si la contraseña es válida; en caso contrario `false`.
   */
  public isPasswordValid(plainPassword: string): boolean {
    void plainPassword;
    throw new Error('User.isPasswordValid is not implemented. Use PasswordService.');
  }
}
