import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import { NotFoundError } from "@shared/errors";

/**
 * Caso de uso para guardar el contenido de una transcripción en tiempo real.
 *
 * Al terminar la sesión WebSocket, el cliente envía el texto transcrito
 * y este caso de uso actualiza la Transcription a status 'completed'.
 */
export class SaveRealtimeTranscriptionUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository
  ) {}

  /**
   * Guarda el contenido de una transcripción en tiempo real.
   *
   * @param transcriptionId - ID de la transcripción (creada al iniciar sesión).
   * @param userId - ID del usuario autenticado.
   * @param content - Texto transcrito.
   * @throws NotFoundError Si la transcripción no existe o no pertenece al usuario.
   */
  public async execute(
    transcriptionId: string,
    userId: string,
    content: string
  ): Promise<void> {
    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new NotFoundError("Transcription", transcriptionId);
    }

    transcription.updateContent(content);
    transcription.updateStatus("completed");
    await this.transcriptionRepository.update(transcription);
  }
}
