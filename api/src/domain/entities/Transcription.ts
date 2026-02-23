/**
 * Estado posible de una transcripción en el sistema.
 */
export type TranscriptionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

/**
 * Tipo de transcripción según su origen: archivo subido (batch) o grabación en tiempo real.
 */
export type TranscriptionType = "batch" | "realtime";

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
  public type?: TranscriptionType;
  public duration?: number;

  /** URL temporal pre-firmada para reproducir el audio original. Solo disponible si status es completed. No se persiste en base de datos. */
  public audioUrl?: string;

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
   * @param type - Tipo de transcripción: "batch" (archivo subido) o "realtime" (grabación en vivo).
   * @param duration - Duración del audio en segundos (opcional).
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
    updatedAt: Date,
    duration?: number,
    type?: TranscriptionType
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
    this.duration = duration;
    this.type = type;
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

  /**
   * Establece el tipo de transcripción (batch/realtime).
   */
  public setType(type: TranscriptionType): void {
    this.type = type;
    this.updatedAt = new Date();
  }

  /**
   * Establece la URL temporal pre-firmada para reproducir el audio (solo cuando status es completed).
   * Se genera dinámicamente al consultar, no se persiste.
   */
  public setAudioUrl(url: string): void {
    this.audioUrl = url;
  }

  /**
   * Establece la duración del audio en segundos.
   */
  public setDuration(duration: number): void {
    this.duration = duration;
    this.updatedAt = new Date();
  }

  /**
   * Actualiza metadatos de archivo (s3Path, fileName, fileSize) para transcripciones realtime.
   */
  public updateRealtimeMetadata(
    s3Path: string,
    fileName: string,
    fileSize: number
  ): void {
    (this as { s3Path: string }).s3Path = s3Path;
    (this as { fileName: string }).fileName = fileName;
    (this as { fileSize: number }).fileSize = fileSize;
    this.updatedAt = new Date();
  }
}
