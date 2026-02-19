/**
 * DTO de petición para iniciar la subida de un archivo de audio.
 *
 * Usado para serializar el cuerpo HTTP que envía el frontend
 * al endpoint de upload (`/transcriptions/upload`).
 */
export interface UploadTranscriptionDTO {
  /**
   * Nombre original del archivo de audio.
   */
  fileName: string;

  /**
   * Tamaño del archivo en bytes.
   * Debe ser <= 20 MB según requisitos.
   */
  fileSize: number;
}

/**
 * DTO de respuesta con la presigned URL para subir el archivo a S3.
 *
 * El cliente usa `uploadUrl` para hacer PUT directamente a S3.
 */
export interface PresignedUrlDTO {
  /**
   * URL presignada donde el cliente debe subir el archivo (PUT).
   */
  uploadUrl: string;

  /**
   * Identificador único de la transcripción creada en estado 'pending'.
   */
  transcriptionId: string;

  /**
   * Tiempo en segundos hasta que la URL expira.
   */
  expiresIn: number;
}
