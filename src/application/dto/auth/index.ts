/**
 * DTO de petición para el registro de usuarios.
 *
 * Usado para serializar el cuerpo HTTP que envía el frontend
 * al endpoint de registro (`/auth/register`).
 *
 * Importante: solo contiene datos de transporte, sin lógica de negocio.
 */
export interface RegisterUserDTO {
  /**
   * Correo electrónico del usuario.
   * Debe ser un email válido según las reglas del dominio.
   */
  email: string;

  /**
   * Contraseña en texto plano recibida desde el frontend.
   * Se encripta/valida en capas posteriores (servicios de dominio/infraestructura).
   */
  password: string;

  /**
   * Confirmación opcional de la contraseña, usada típicamente
   * para validaciones en el handler o middleware de validación.
   */
  confirmPassword?: string;
}

/**
 * DTO de petición para el inicio de sesión de usuarios.
 *
 * Usado para serializar el cuerpo HTTP que envía el frontend
 * al endpoint de login (`/auth/login`).
 *
 * Importante: solo contiene datos de transporte, sin lógica de negocio.
 */
export interface LoginUserDTO {
  /**
   * Correo electrónico del usuario que desea autenticarse.
   */
  email: string;

  /**
   * Contraseña en texto plano enviada por el frontend.
   */
  password: string;
}

/**
 * DTO de respuesta de autenticación.
 *
 * Usado para serializar la respuesta HTTP que el backend envía
 * al frontend después de un login/registro exitoso.
 *
 * Importante: solo contiene datos de transporte, sin lógica de negocio.
 */
export interface AuthResponseDTO {
  /**
   * Identificador único del usuario autenticado.
   */
  userId: string;

  /**
   * Correo electrónico asociado al usuario autenticado.
   */
  email: string;

  /**
   * Token de acceso (JWT u otro formato) que el frontend usará
   * para autenticar peticiones posteriores.
   */
  accessToken: string;

  /**
   * Token de refresco usado para obtener nuevos tokens de acceso
   * sin requerir que el usuario vuelva a introducir sus credenciales.
   */
  refreshToken: string;

  /**
   * Tiempo en segundos hasta que el `accessToken` expira.
   * Normalmente 3600 (1 hora).
   */
  expiresIn: number;
}

