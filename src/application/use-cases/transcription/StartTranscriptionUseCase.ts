import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { IJobMappingRepository } from "@domain/repositories/IJobMappingRepository";
import type { IExternalApiService } from "@application/ports/IExternalApiService";
import type { IStorageService } from "@application/ports/IStorageService";

const PRESIGNED_GET_EXPIRES_IN = 3600; // 1 hour — enough for Speechmatics to fetch

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
   */
  public async execute(
    userId: string,
    transcriptionId: string,
    s3Key: string,
    language: string = "en"
  ): Promise<void> {
    console.log(`[StartTranscription] Iniciando proceso para ${transcriptionId}`);

    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new Error(
        `Transcription ${transcriptionId} not found for user ${userId}`
      );
    }

    const audioUrl = await this.storageService.generateDownloadPresignedUrl(
      s3Key,
      PRESIGNED_GET_EXPIRES_IN
    );

    console.log("[Upload] Iniciando envío a Speechmatics para ID:", transcriptionId);
    const { jobId } = await this.externalApiService.submitJob(audioUrl, language);

    console.log("[StartTranscriptionUseCase] Llamando a jobMappingRepository.save:", { jobId, transcriptionId, userId });
    await this.jobMappingRepository.save(jobId, transcriptionId, userId);
    console.log("[StartTranscriptionUseCase] jobMappingRepository.save completado");

    transcription.updateStatus("processing");
    await this.transcriptionRepository.update(transcription);
  }
}
