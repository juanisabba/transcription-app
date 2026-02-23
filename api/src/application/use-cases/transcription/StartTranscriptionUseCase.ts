import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { IJobMappingRepository } from "@domain/repositories/IJobMappingRepository";
import type { IExternalApiService } from "@application/ports/IExternalApiService";
import type { IStorageService } from "@application/ports/IStorageService";

const PRESIGNED_GET_EXPIRES_IN = 3600; // 1 hour — enough for Speechmatics to fetch
const JOB_MAPPING_SAVE_RETRIES = 3;

/**
 * Caso de uso que inicia el proceso de transcripción asíncrona con Speechmatics.
 *
 * Se ejecuta cuando S3 detecta que un archivo de audio ha sido subido.
 * 1. Genera una presigned GET URL para que Speechmatics pueda descargar el audio.
 * 2. Envía el job a Speechmatics.
 * 3. Persiste el mapping jobId → transcriptionId + userId en DynamoDB.
 * 4. Actualiza el estado de la transcripción a 'processing'.
 */
export class StartTranscriptionUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository,
    private readonly jobMappingRepository: IJobMappingRepository,
    private readonly externalApiService: IExternalApiService,
    private readonly storageService: IStorageService
  ) {}

  /**
   * Inicia el job de transcripción en Speechmatics.
   *
   * @param userId - ID del usuario propietario de la transcripción.
   * @param transcriptionId - ID de la transcripción creada en estado 'pending'.
   * @param s3Key - Clave S3 del archivo de audio subido.
   * @param language - Idioma del audio (ISO 639-1, por defecto 'en').
   * @param duration - Duración del audio en segundos (opcional).
   */
  public async execute(
    userId: string,
    transcriptionId: string,
    s3Key: string,
    language: string = "en",
    duration?: number
  ): Promise<void> {
    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new Error(
        `Transcripción ${transcriptionId} no encontrada para el usuario ${userId}`
      );
    }

    if (transcription.status === "completed") {
      return;
    }

    // 1. PRIMERO: actualizar pending -> processing (optimistic lock)
    //    Solo el que gana la carrera continúa. Evita jobs duplicados cuando S3 y ConfirmUpload corren en paralelo.
    transcription.updateStatus("processing");
    if (typeof duration === "number" && duration >= 0) {
      transcription.setDuration(duration);
    }

    try {
      await this.transcriptionRepository.update(transcription, {
        onlyIfStatus: "pending",
      });
    } catch (updateError) {
      const err = updateError as Error & { name?: string };
      if (err.name === "ConditionalCheckFailedException") {
        return;
      }
      console.error("[StartTranscription] update error:", err);
      throw updateError;
    }

    try {
      const audioUrl = await this.storageService.generateDownloadPresignedUrl(
        s3Key,
        PRESIGNED_GET_EXPIRES_IN
      );

      const { jobId } = await this.externalApiService.submitJob(audioUrl, language);
      await this.saveJobMappingWithRetry(jobId, transcriptionId, userId);
    } catch (s3Error) {
      const err = s3Error as Error & { name?: string };
      const msg = (err.message ?? "").toLowerCase();
      const isAccessDenied =
        err.name === "AccessDenied" ||
        err.name === "Forbidden" ||
        msg.includes("accessdenied") ||
        msg.includes("access denied");
      const isOffline = process.env.IS_OFFLINE === "true";

      if (isAccessDenied || isOffline) {
        console.warn(
          "[StartTranscription] No se pudo enviar a Speechmatics (transcripción ya en processing):",
          err.message ?? s3Error
        );
        return;
      }
      throw s3Error;
    }
  }

  /**
   * Guarda el mapping jobId->transcriptionId con reintentos.
   * El jobId debe persistirse siempre para que el webhook pueda procesar el resultado.
   */
  private async saveJobMappingWithRetry(
    jobId: string,
    transcriptionId: string,
    userId: string
  ): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= JOB_MAPPING_SAVE_RETRIES; attempt++) {
      try {
        await this.jobMappingRepository.save(jobId, transcriptionId, userId);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }
}
