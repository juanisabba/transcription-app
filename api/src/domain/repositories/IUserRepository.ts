import { User } from '../entities/User';

/**
 * Puerto de persistencia para la entidad de dominio `User`.
 *
 * Define el contrato que deben implementar los adaptadores de infraestructura
 * (por ejemplo, repositorios basados en DynamoDB, PostgreSQL, etc.) sin
 * exponer detalles técnicos al dominio.
 */
export interface IUserRepository {
  /**
   * Busca un usuario por su dirección de correo electrónico.
   *
   * Se utiliza típicamente para verificar si un usuario ya existe antes de
   * registrarlo.
   *
   * @param email - Dirección de correo electrónico del usuario.
   * @returns Una promesa que resuelve con el `User` encontrado o `null` si no existe.
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Busca un usuario por su identificador único.
   *
   * Se utiliza después del login para recuperar todos los datos del usuario
   * asociados a su `id`.
   *
   * @param id - Identificador único del usuario.
   * @returns Una promesa que resuelve con el `User` encontrado o `null` si no existe.
   */
  findById(id: string): Promise<User | null>;

  /**
   * Persiste un nuevo usuario en el sistema de almacenamiento.
   *
   * Debe guardar todas las propiedades relevantes del usuario, incluyendo
   * `id`, `email`, `passwordHash`, `createdAt` y, cuando aplique, `lastLoginAt`.
   * La detección y gestión de conflictos (por ejemplo, usuario ya existente)
   * puede realizarse en el caso de uso o mediante una excepción de conflicto
   * lanzada por la implementación.
   *
   * @param user - Entidad de usuario de dominio a persistir.
   * @returns Una promesa que se resuelve cuando la operación finaliza.
   */
  save(user: User): Promise<void>;

  /**
   * Actualiza la marca temporal del último inicio de sesión de un usuario.
   *
   * Se utiliza con fines de auditoría inmediatamente después de un login
   * exitoso. La implementación debe establecer el valor de `lastLoginAt`
   * (normalmente con la fecha y hora actual) para el usuario identificado
   * por el `id` proporcionado.
   *
   * @param id - Identificador único del usuario cuyo último login se va a actualizar.
   * @returns Una promesa que se resuelve cuando la actualización se ha aplicado.
   */
  updateLastLogin(id: string): Promise<void>;
}

