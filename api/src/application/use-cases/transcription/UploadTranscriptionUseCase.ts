import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { IStorageService } from "@application/ports/IStorageService";
import type { UploadTranscriptionDTO, PresignedUrlDTO } from "@application/dto/transcription";
import { Transcription } from "@domain/entities/Transcription";
import { ValidationError } from "@shared/errors";
import { InvalidFileTypeException } from "@domain/exceptions/InvalidFileTypeException";
import { MAX_FILE_SIZE_BYTES } from "@shared/utils/validation";
import { v4 as uuid } from "uuid";

/** Content-Type debe ser audio/* (audio/mp3, audio/ogg, audio/wav, etc.). */
const AUDIO_MIME_PREFIX = "audio/";

/** URLs presignadas: 1 hora. Tiempo razonable para subida sin comprometer seguridad. */
const PRESIGNED_URL_EXPIRES_IN = 3600;

/**
 * Sanitiza el nombre de archivo para evitar problemas con Speechmatics/S3:
 * espacios -> _, paréntesis eliminados (urls con () pueden fallar al descargar).
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "");
}

/**
 * Formato de audio preferido: OGG/Opus (nativo de WhatsApp).
 * Ofrece mejor eficiencia de almacenamiento y calidad de voz que MP3/WAV.
 */

/**
 * Caso de uso responsable de iniciar la subida de un archivo de audio.
 *
 * 1. Valida fileName y fileSize (<= 20 MB).
 * 2. Crea la entidad Transcription en estado 'pending'.
 * 3. Persiste en BD.
 * 4. Genera presigned URL de S3.
 * 5. Retorna la URL para que el cliente suba directamente a S3.
 */
export class UploadTranscriptionUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository,
    private readonly storageService: IStorageService
  ) {}

  /**
   * Ejecuta el flujo de upload.
   *
   * @param userId - ID del usuario autenticado (extraído del token).
   * @param request - Datos de la subida (fileName, fileSize).
   * @returns PresignedUrlDTO con uploadUrl, transcriptionId y expiresIn.
   * @throws ValidationError Si falta fileName, fileSize no es número o supera 20 MB.
   */
  public async execute(
    userId: string,
    request: UploadTranscriptionDTO
  ): Promise<PresignedUrlDTO> {
    const { fileName, fileSize, contentType } = request;

    // Paso 1: Validar request
    if (!fileName || typeof fileName !== "string" || !fileName.trim()) {
      throw new ValidationError("fileName es requerido");
    }

    if (typeof fileSize !== "number" || !Number.isFinite(fileSize)) {
      throw new ValidationError("fileSize must be a number");
    }
    if (fileSize < 0) {
      throw new ValidationError("fileSize no puede ser negativo");
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `fileSize excede el límite de 20 MB (máx ${MAX_FILE_SIZE_BYTES} bytes)`,
      );
    }

    if (contentType !== undefined && contentType !== null && contentType !== "") {
      const ct = typeof contentType === "string" ? contentType.trim().toLowerCase() : "";
      if (!ct.startsWith(AUDIO_MIME_PREFIX)) {
        throw new InvalidFileTypeException(contentType);
      }
    }

    // Paso 3: Crear entidad Transcription (nombre sanitizado para S3/Speechmatics)
    const transcriptionId = uuid();
    const safeFileName = sanitizeFileName(fileName);
    const s3Path = `uploads/${userId}/${transcriptionId}/${safeFileName}`;
    const now = new Date();

    const transcription = new Transcription(
      transcriptionId,
      userId,
      safeFileName,
      fileSize,
      "pending",
      s3Path,
      "",
      now,
      now,
      undefined,
      "batch"
    );

    try {
      await this.transcriptionRepository.save(transcription);
    } catch (saveErr) {
      console.error("[UploadTranscription] save error:", saveErr);
      throw saveErr;
    }

    try {
      const uploadUrl = await this.storageService.generatePresignedUrl(
        s3Path,
        PRESIGNED_URL_EXPIRES_IN
      );

      // Paso 6: Retornar DTO
      return {
        uploadUrl,
        transcriptionId,
        expiresIn: PRESIGNED_URL_EXPIRES_IN,
      };
    } catch (urlErr) {
      console.error("[UploadTranscription] presigned URL error:", urlErr);
      throw urlErr;
    }
  }
}
