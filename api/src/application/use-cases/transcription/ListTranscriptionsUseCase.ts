import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import type { Transcription } from "@domain/entities/Transcription";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 10;

export interface ListTranscriptionsResult {
  items: Transcription[];
  hasMore: boolean;
  totalPages: number;
  currentPage: number;
}

/**
 * Caso de uso para listar el historial de transcripciones de un usuario.
 *
 * Implementa paginación por página (page, pageSize) iterando internamente
 * con cursor de DynamoDB para alcanzar la página solicitada.
 */
export class ListTranscriptionsUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository
  ) {}

  /**
   * Lista las transcripciones del usuario con paginación por página.
   *
   * @param userId - ID del usuario autenticado.
   * @param page - Número de página (1-based).
   * @param pageSize - Elementos por página (máx. 10).
   * @returns Lista paginada con items, hasMore, totalPages, currentPage.
   */
  public async execute(
    userId: string,
    page: number = 1,
    pageSize: number = DEFAULT_PAGE_SIZE
  ): Promise<ListTranscriptionsResult> {
    const size = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
    const requestedPage = Math.max(1, page);

    let cursor: string | undefined;
    let currentBatch: {
      items: Transcription[];
      hasMore: boolean;
      nextCursor?: string;
    };

    for (let i = 0; i < requestedPage; i++) {
      currentBatch = await this.transcriptionRepository.findByUserId(
        userId,
        size,
        cursor
      );
      if (i < requestedPage - 1) {
        if (!currentBatch.hasMore || !currentBatch.nextCursor) {
          return {
            items: [],
            hasMore: false,
            totalPages: requestedPage - 1 || 1,
            currentPage: requestedPage,
          };
        }
        cursor = currentBatch.nextCursor;
      }
    }

    const totalPages = currentBatch!.hasMore
      ? requestedPage + 1
      : requestedPage;

    return {
      items: currentBatch!.items,
      hasMore: currentBatch!.hasMore,
      totalPages,
      currentPage: requestedPage,
    };
  }
}
