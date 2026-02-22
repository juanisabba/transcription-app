import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { IStorageService } from "@application/ports/IStorageService";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@shared/errors";

/**
 * Caso de uso para eliminar una transcripción de forma segura.
 *
 * Orden de operaciones:
 * 1. Validar inputs
 * 2. Buscar transcripción en DynamoDB
 * 3. Verificar ownership
 * 4. Borrar de S3 primero
 * 5. Borrar de DynamoDB después
 *
 * Si S3 falla, se continúa con DynamoDB (mejor BD limpia que archivo huérfano).
 * Si DynamoDB falla, se lanza el error.
 */
export class DeleteTranscriptionUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository,
    private readonly storageService: IStorageService
  ) {}

  /**
   * Elimina una transcripción del sistema.
   *
   * @param userId - ID del usuario autenticado (propietario).
   * @param transcriptionId - ID de la transcripción a eliminar.
   */
  public async execute(
    userId: string,
    transcriptionId: string
  ): Promise<void> {
    if (!userId || userId.trim() === "") {
      throw new UnauthorizedError("userId es requerido");
    }
    if (!transcriptionId || transcriptionId.trim() === "") {
      throw new ValidationError("transcriptionId es requerido");
    }

    const transcription = await this.transcriptionRepository.findById(
      transcriptionId,
      userId
    );

    if (!transcription) {
      throw new NotFoundError(
        "Transcripción",
        transcriptionId
      );
    }

    if (transcription.userId !== userId) {
      throw new ForbiddenError(
        "Solo puedes eliminar tus propias transcripciones"
      );
    }

    if (!transcription.s3Path || transcription.s3Path.trim() === "") {
      console.warn(
        `[DeleteTranscription] Warning: s3Path is empty for ${transcriptionId}`
      );
    } else {
      try {
        await this.storageService.deleteFile(transcription.s3Path);
      } catch (error) {
        console.error("[DeleteTranscription] ⚠️ S3 delete failed:", error);
        // NO lanzar error - continuar con DynamoDB
        // Es mejor que BD esté limpia aunque S3 falle
      }
    }

    try {
      await this.transcriptionRepository.delete(transcriptionId, userId);
    } catch (error) {
      console.error("[DeleteTranscription] ❌ DynamoDB delete failed:", error);
      throw error;
    }
  }
}
