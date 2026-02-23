import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";

export interface StatsResult {
  totalBatchSeconds: number;
  totalRealtimeSeconds: number;
}

/**
 * Caso de uso para obtener estadísticas de uso del usuario.
 * Suma duration agrupado por type (batch, realtime).
 */
export class GetStatsUseCase {
  constructor(
    private readonly transcriptionRepository: ITranscriptionRepository,
  ) {}

  /**
   * Obtiene total de segundos por tipo de transcripción.
   */
  public async execute(userId: string): Promise<StatsResult> {
    return this.transcriptionRepository.getStatsByUserId(userId);
  }
}
