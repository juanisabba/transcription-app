/**
 * Value Object que representa un email de usuario.
 *
 * Inmutable, auto-validado y sin dependencias de infraestructura.
 */
export class Email {
  /**
   * Valor de email validado.
   */
  public readonly value: string;

  /**
   * Crea un nuevo `Email` validando el formato.
   *
   * @param email - Cadena con el email a validar.
   * @throws {Error} Si el formato de email es inválido.
   */
  constructor(email: string) {
    if (!Email.isValid(email)) {
      throw new Error(`Formato de email inválido: ${email}`);
    }

    this.value = email;
  }

  /**
   * Valida si una cadena tiene formato de email válido.
   *
   * @param email - Cadena a validar.
   * @returns `true` si el formato es válido, `false` en caso contrario.
   */
  public static isValid(email: string): boolean {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return EMAIL_REGEX.test(email);
  }
}
