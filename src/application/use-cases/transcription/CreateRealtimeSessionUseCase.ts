import type { IExternalApiService } from "@application/ports/IExternalApiService";

const REALTIME_TOKEN_TTL = 60; // seconds — minimum allowed by Speechmatics

export interface RealtimeSessionDTO {
  /** Short-lived JWT token the client uses to connect to Speechmatics WebSocket. */
  token: string;
  /** WebSocket URL the client should connect to (e.g. wss://eu2.rt.speechmatics.com/v2/). */
  wsUrl: string;
  /** Token TTL in seconds so the client knows when it expires. */
  ttl: number;
}

/**
 * Caso de uso que crea una sesión temporal para transcripción en tiempo real.
 *
 * En lugar de exponer la API key principal al frontend, este caso de uso
 * solicita a la API de gestión de Speechmatics un JWT de corta duración
 * (TTL mínimo: 60s) que el navegador puede usar directamente para abrir
 * una conexión WebSocket con el servicio de transcripción en tiempo real.
 *
 * Flujo:
 * 1. Frontend llama a POST /transcriptions/realtime (con Bearer token de Cognito).
 * 2. Este use case obtiene el token temporal de Speechmatics Management API.
 * 3. Devuelve { token, wsUrl, ttl } al frontend.
 * 4. Frontend conecta al WebSocket de Speechmatics usando ese token.
 * 5. El token expira automáticamente tras `ttl` segundos.
 */
export class CreateRealtimeSessionUseCase {
  constructor(
    private readonly externalApiService: IExternalApiService
  ) {}

  /**
   * Genera un token temporal para la Speechmatics Realtime API.
   *
   * @returns DTO con el token, la URL del WebSocket y el TTL en segundos.
   * @throws Error Si la creación del token falla en Speechmatics.
   */
  public async execute(): Promise<RealtimeSessionDTO> {
    const { token, wsUrl } = await this.externalApiService.createRealtimeToken(
      REALTIME_TOKEN_TTL
    );

    return {
      token,
      wsUrl,
      ttl: REALTIME_TOKEN_TTL,
    };
  }
}
