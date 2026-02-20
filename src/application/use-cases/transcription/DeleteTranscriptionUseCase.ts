import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { IStorageService } from "@application/ports/IStorageService";
import { NotFoundError } from "@shared/errors";

/**
 * Caso de uso para eliminar una transcripción.
 *
 * Valida que la transcripción pertenezca al usuario, elimina el archivo de S3
 * si existe, y elimina el registro de DynamoDB.
 */
export class DeleteTranscriptionUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository,
    private readonly storageService: IStorageService
  ) {}

  /**
   * Elimina una transcripción del sistema.
   *
   * @param transcriptionId - ID de la transcripción a eliminar.
   * @param userId - ID del usuario autenticado (propietario).
   * @throws NotFoundError Si la transcripción no existe o no pertenece al usuario.
   */
  public async execute(
    transcriptionId: string,
    userId: string
  ): Promise<void> {
    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new NotFoundError("Transcription", transcriptionId);
    }

    if (transcription.s3Path) {
      try {
        await this.storageService.deleteFile(transcription.s3Path);
      } catch (err) {
        console.warn(
          `DeleteTranscription: could not delete S3 object ${transcription.s3Path}`,
          err
        );
        // Continuar con la eliminación en DynamoDB aunque falle S3
      }
    }

    await this.transcriptionRepository.delete(transcriptionId, userId);
  }
}
