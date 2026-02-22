import type { IRealtimeTokenProvider } from "@application/ports/IRealtimeTokenProvider";

export interface RealtimeTokenDTO {
  token: string;
  wsUrl: string;
  expiresIn: number;
}

/**
 * Caso de uso que obtiene un token temporal de Speechmatics para sesión en tiempo real.
 *
 * El token permite al cliente conectarse directamente al WebSocket de Speechmatics
 * sin exponer la API key principal.
 */
export class GetRealtimeTokenUseCase {
  constructor(private readonly tokenProvider: IRealtimeTokenProvider) {}

  /**
   * Obtiene un token temporal para transcripción en tiempo real.
   *
   * @param userId - ID del usuario autenticado (para logging/auditoría).
   * @returns DTO con token, wsUrl y expiresIn.
   */
  public async execute(userId: string): Promise<RealtimeTokenDTO> {
    return this.tokenProvider.getRealtimeToken(userId);
  }
}
