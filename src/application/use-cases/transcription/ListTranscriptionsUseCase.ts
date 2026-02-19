import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { Transcription } from "@domain/entities/Transcription";

const DEFAULT_PAGE_SIZE = 10;

export interface ListTranscriptionsResult {
  items: Transcription[];
  hasMore: boolean;
  nextCursor?: string;
  page: number;
}

/**
 * Caso de uso para listar el historial de transcripciones de un usuario.
 *
 * Implementa paginación por cursor (DynamoDB LastEvaluatedKey) con un
 * tamaño de página fijo de 10 elementos.
 */
export class ListTranscriptionsUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository
  ) {}

  /**
   * Lista las transcripciones del usuario con paginación.
   *
   * @param userId - ID del usuario autenticado.
   * @param cursor - Cursor de la página siguiente (opcional).
   * @param limit - Número de elementos por página (por defecto 10).
   * @returns Lista paginada de transcripciones.
   */
  public async execute(
    userId: string,
    cursor?: string,
    limit: number = DEFAULT_PAGE_SIZE
  ): Promise<ListTranscriptionsResult> {
    const pageSize = Math.min(Math.max(1, limit), DEFAULT_PAGE_SIZE);

    const { items, hasMore, nextCursor } =
      await this.transcriptionRepository.findByUserId(userId, pageSize, cursor);

    return {
      items,
      hasMore,
      nextCursor,
      page: pageSize,
    };
  }
}
