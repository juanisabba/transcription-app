/**
 * Estado posible de una transcripción en el sistema.
 */
export type TranscriptionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/**
 * Entidad de dominio que representa una transcripción en Vocali.
 *
 * - Propiedades inmutables: id, userId, fileName, s3Path, createdAt.
 * - Propiedades mutables: status, content, updatedAt (vía updateStatus/updateContent).
 * - No depende de infraestructura ni librerías externas (Arquitectura Hexagonal).
 */
export class Transcription {
  public readonly id: string;
  public readonly userId: string;
  public readonly fileName: string;
  public readonly fileSize: number;
  public status: TranscriptionStatus;
  public readonly s3Path: string;
  public content: string;
  public readonly createdAt: Date;
  public updatedAt: Date;

  /**
   * Crea una nueva instancia de `Transcription`.
   *
   * @param id - Identificador único (UUID).
   * @param userId - ID del usuario propietario.
   * @param fileName - Nombre original del archivo.
   * @param fileSize - Tamaño del archivo en bytes (Number para analíticas de almacenamiento).
   * @param status - Estado actual de la transcripción.
   * @param s3Path - Ruta en S3 donde se almacena el archivo.
   * @param content - Texto transcrito (puede estar vacío si está en proceso).
   * @param createdAt - Fecha y hora de creación.
   * @param updatedAt - Fecha y hora de última actualización.
   */
  constructor(
    id: string,
    userId: string,
    fileName: string,
    fileSize: number,
    status: TranscriptionStatus,
    s3Path: string,
    content: string,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.userId = userId;
    this.fileName = fileName;
    this.fileSize = fileSize;
    this.status = status;
    this.s3Path = s3Path;
    this.content = content;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Actualiza el estado de la transcripción y la marca de actualización.
   *
   * @param status - Nuevo estado.
   */
  public updateStatus(status: TranscriptionStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  /**
   * Actualiza el contenido transcrito y la marca de actualización.
   *
   * @param content - Nuevo contenido textual.
   */
  public updateContent(content: string): void {
    this.content = content;
    this.updatedAt = new Date();
  }
}
