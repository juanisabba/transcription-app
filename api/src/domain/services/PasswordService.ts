import * as bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Servicio de dominio para lógica de contraseñas.
 *
 * Este servicio es completamente independiente de infraestructura
 * y puede ser testeado de forma aislada.
 */
export class PasswordService {
  /**
   * Genera el hash de una contraseña en texto plano.
   *
   * @param plainPassword - Contraseña en texto plano.
   * @returns Cadena con la contraseña hasheada.
   */
  public hash(plainPassword: string): string {
    return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
  }

  /**
   * Valida si una contraseña en texto plano coincide con un hash almacenado.
   *
   * @param plainPassword - Contraseña en texto plano.
   * @param hash - Hash de contraseña previamente generado.
   * @returns `true` si coinciden, `false` en caso contrario.
   */
  public validate(plainPassword: string, hash: string): boolean {
    return bcrypt.compareSync(plainPassword, hash);
  }

  /**
   * Verifica si una contraseña cumple los requisitos de seguridad.
   *
   * Requisitos:
   * - Mínimo 8 caracteres.
   * - Al menos 1 mayúscula.
   * - Al menos 1 minúscula.
   * - Al menos 1 número.
   * - Al menos 1 carácter especial.
   *
   * @param password - Contraseña a validar.
   * @returns `true` si la contraseña es fuerte, `false` en caso contrario.
   */
  public isStrongPassword(password: string): boolean {
    const minLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar =
      /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

    return (
      minLength &&
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecialChar
    );
  }
}

