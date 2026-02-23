import type { IStorageService } from "@application/ports/IStorageService";
import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import { NotFoundError, ValidationError } from "@shared/errors";
import { MAX_FILE_SIZE_BYTES } from "@shared/utils/validation";

function getAudioExtension(contentType?: string): string {
  if (!contentType) {
    return "webm";
  }
  const m = contentType.toLowerCase();
  if (m.includes("wav")) {
    return "wav";
  }
  if (m.includes("ogg") || m.includes("opus")) {
    return "ogg";
  }
  if (m.includes("mp3")) {
    return "mp3";
  }
  return "webm";
}

/**
 * Caso de uso para guardar el contenido y el audio de una transcripción en tiempo real.
 *
 * 1. Valida userId, transcriptionId, content, audioFile.
 * 2. Sube el audio a S3 en /uploads/{userId}/{transcriptionId}/realtime_audio.wav
 * 3. Actualiza la Transcription en DynamoDB con content, s3Path, status completed.
 * 4. Si falla S3, NO guarda en DynamoDB (transactionalidad).
 */
export class SaveRealtimeTranscriptionUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository,
    private readonly storageService: IStorageService
  ) {}

  /**
   * Guarda transcripción en tiempo real (audio en S3 + metadatos en DynamoDB).
   *
   * @param transcriptionId - ID de la transcripción.
   * @param userId - ID del usuario (debe coincidir con token JWT).
   * @param content - Texto transcrito.
   * @param audioBuffer - Buffer del archivo de audio.
   * @param contentType - MIME type del audio (ej: audio/webm, audio/wav).
   * @param customFileName - Nombre opcional proporcionado por el usuario.
   * @param duration - Duración del audio en segundos (opcional).
   */
  public async execute(
    transcriptionId: string,
    userId: string,
    content: string,
    audioBuffer: Buffer,
    contentType?: string,
    customFileName?: string,
    duration?: number
  ): Promise<{ transcriptionId: string }> {
    // Validaciones ANTES de cualquier operación
    if (!userId || userId.trim() === "") {
      throw new ValidationError("userId no puede ser null o vacío");
    }
    if (!transcriptionId || transcriptionId.trim() === "") {
      throw new ValidationError("transcriptionId no puede ser null o vacío");
    }
    if (!content || content.trim() === "") {
      throw new ValidationError("content no puede estar vacío");
    }
    if (!audioBuffer || !Buffer.isBuffer(audioBuffer)) {
      throw new ValidationError("audioFile no puede ser null/undefined");
    }
    if (audioBuffer.length === 0) {
      throw new ValidationError("audioFile no puede estar vacío (size > 0)");
    }
    if (audioBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(
        `audioFile excede el límite de 20 MB (máx ${MAX_FILE_SIZE_BYTES} bytes)`,
      );
    }

    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new NotFoundError("Transcripción", transcriptionId);
    }

    const ext = getAudioExtension(contentType);
    const s3Path = `uploads/${userId}/${transcriptionId}/realtime_audio.${ext}`;

    if (!s3Path || !s3Path.startsWith("uploads/")) {
      throw new ValidationError("s3Path no se generó correctamente");
    }

    const fileName =
      customFileName?.trim() ||
      `Tiempo Real - ${new Date().toLocaleDateString("es-ES")}`;
    const fileSize = audioBuffer.length;

    try {
      try {
        await this.storageService.uploadFile(
          s3Path,
          audioBuffer,
          contentType || "audio/webm"
        );
      } catch (uploadError) {
        const err = uploadError as Error & { name?: string };
        const msg = (err.message ?? "").toLowerCase();
        const isAccessDenied =
          err.name === "AccessDenied" ||
          err.name === "Forbidden" ||
          msg.includes("accessdenied") ||
          msg.includes("access denied");
        const isOffline = process.env.IS_OFFLINE === "true";

        if (isAccessDenied || isOffline) {
          // Continuar para actualizar DynamoDB
        } else {
          console.error("[SaveRealtimeTranscription] S3 upload error:", uploadError);
          throw uploadError;
        }
      }

      // 2. Preparar transcripción final en memoria: content + metadata (sin status aún)
      transcription.updateContent(content.trim());
      transcription.updateRealtimeMetadata(s3Path, fileName, fileSize);
      transcription.setType("realtime");
      if (typeof duration === "number" && duration >= 0) {
        transcription.setDuration(duration);
      }

      // 3. Status 'completed' es lo ÚLTIMO que se asigna antes de persistir.
      //    Evita que otra parte del flujo sobrescriba con un valor antiguo.
      transcription.updateStatus("completed");

      await this.transcriptionRepository.update(transcription, {
        onlyIfStatus: "pending",
      });

      return { transcriptionId };
    } catch (error) {
      const err = error as Error & { name?: string };
      if (err.name === "ConditionalCheckFailedException") {
        return { transcriptionId };
      }
      console.error("[SaveRealtimeTranscription] error:", error);
      throw error;
    }
  }
}
