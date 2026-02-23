import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import { NotFoundError } from "@shared/errors";

export interface GetTranscriptionResult {
  id: string;
  fileName: string;
  status: string;
  type?: string;
  duration?: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  audioUrl?: string;
}

/**
 * Caso de uso para obtener los detalles de una transcripción.
 *
 * Devuelve la transcripción completa e incluye audioUrl (URL firmada de S3)
 * cuando la transcripción está completada y tiene s3Path.
 */
export class GetTranscriptionUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository
  ) {}

  /**
   * Obtiene una transcripción por ID para el usuario autenticado.
   *
   * @param userId - ID del usuario autenticado.
   * @param transcriptionId - ID de la transcripción.
   * @returns Detalles de la transcripción con audioUrl si aplica.
   * @throws NotFoundError Si la transcripción no existe o no pertenece al usuario.
   */
  public async execute(
    userId: string,
    transcriptionId: string
  ): Promise<GetTranscriptionResult> {
    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new NotFoundError("Transcripción", transcriptionId);
    }

    let audioUrl: string | undefined;
    if (
      transcription.status === "completed" &&
      transcription.s3Path &&
      transcription.s3Path.trim() !== ""
    ) {
      audioUrl = await this.transcriptionRepository.getAudioUrl(
        transcription.s3Path
      );
    }

    return {
      id: transcription.id,
      fileName: transcription.fileName,
      status: transcription.status,
      type: transcription.type,
      duration: transcription.duration,
      content: transcription.content,
      createdAt: transcription.createdAt.toISOString(),
      updatedAt: transcription.updatedAt.toISOString(),
      audioUrl,
    };
  }
}
