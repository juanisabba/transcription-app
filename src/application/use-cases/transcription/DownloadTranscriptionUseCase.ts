import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import { NotFoundError } from "@shared/errors";

export interface DownloadTranscriptionResult {
  transcriptionId: string;
  fileName: string;
  content: string;
  status: string;
}

/**
 * Caso de uso para descargar el texto de una transcripción completada.
 *
 * Verifica que el usuario sea el propietario de la transcripción y que
 * esté en estado 'completed' antes de devolver el contenido.
 */
export class DownloadTranscriptionUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository
  ) {}

  /**
   * Descarga el contenido textual de una transcripción.
   *
   * @param userId - ID del usuario autenticado.
   * @param transcriptionId - ID de la transcripción a descargar.
   * @returns Resultado con el contenido de la transcripción.
   * @throws NotFoundError Si la transcripción no existe o no pertenece al usuario.
   * @throws Error Si la transcripción no está completada.
   */
  public async execute(
    userId: string,
    transcriptionId: string
  ): Promise<DownloadTranscriptionResult> {
    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new NotFoundError("Transcripción", transcriptionId);
    }

    if (transcription.status !== "completed") {
      throw new Error(
        `La transcripción ${transcriptionId} no está lista para descargar (estado: ${transcription.status})`
      );
    }

    return {
      transcriptionId: transcription.id,
      fileName: transcription.fileName,
      content: transcription.content,
      status: transcription.status,
    };
  }
}
