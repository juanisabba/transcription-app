import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { IStorageService } from "@application/ports/IStorageService";
import type { UploadTranscriptionDTO, PresignedUrlDTO } from "@application/dto/transcription";
import { Transcription } from "@domain/entities/Transcription";
import { ValidationError } from "@shared/errors";
import { v4 as uuid } from "uuid";

const PRESIGNED_URL_EXPIRES_IN = 3600; // 1 hour

/** Límite máximo 20 MB según requisitos (20.971.520 bytes). */
const MAX_FILE_SIZE_BYTES = 20_971_520;

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
    const { fileName, fileSize } = request;

    // Paso 1: Validar request
    if (!fileName || typeof fileName !== "string" || !fileName.trim()) {
      throw new ValidationError("fileName is required");
    }

    if (typeof fileSize !== "number") {
      throw new ValidationError("fileSize must be a number");
    }

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `fileSize exceeds 20 MB limit (max ${MAX_FILE_SIZE_BYTES} bytes)`
      );
    }

    // Paso 3: Crear entidad Transcription
    const transcriptionId = uuid();
    const s3Path = `uploads/${userId}/${transcriptionId}/${fileName.trim()}`;
    const now = new Date();

    const transcription = new Transcription(
      transcriptionId,
      userId,
      fileName.trim(),
      fileSize,
      "pending",
      s3Path,
      "",
      now,
      now
    );

    // Paso 4: Guardar en BD
    await this.transcriptionRepository.save(transcription);

    // Paso 5: Generar presigned URL
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
  }
}
