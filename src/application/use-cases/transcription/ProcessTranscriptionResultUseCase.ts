import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { IExternalApiService } from "@application/ports/IExternalApiService";

/**
 * Caso de uso que procesa el resultado de una transcripción asincrónica.
 *
 * Obtiene el transcript de Speechmatics (o lo recibe del webhook),
 * actualiza la entidad Transcription con status 'completed' y content.
 */
export class ProcessTranscriptionResultUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository,
    private readonly externalApiService: IExternalApiService
  ) {}

  /**
   * Procesa el resultado y actualiza la transcripción.
   *
   * @param jobId - ID del job de Speechmatics.
   * @param transcriptionId - ID de nuestra transcripción.
   * @param userId - ID del usuario propietario (para findByJobId multi-tenant).
   * @param transcript - Transcript ya obtenido (opcional, si viene en el webhook).
   *                     Si no se proporciona, se obtiene vía getResult(jobId).
   */
  async execute(
    jobId: string,
    transcriptionId: string,
    userId: string,
    transcript?: string
  ): Promise<void> {
    let transcriptText = transcript;

    if (transcriptText === undefined || transcriptText === "") {
      const result = await this.externalApiService.getResult(jobId);
      transcriptText = result.transcript;
    }

    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new Error(`Transcripción ${transcriptionId} no encontrada`);
    }

    transcription.updateStatus("completed");
    transcription.updateContent(transcriptText ?? "");

    await this.transcriptionRepository.update(transcription);
  }
}
