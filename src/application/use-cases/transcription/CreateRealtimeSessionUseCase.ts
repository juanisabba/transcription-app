import type { IExternalApiService } from "@application/ports/IExternalApiService";
import type { ITranscriptionRepository } from "@domain/repositories/ITranscriptionRepository";
import { Transcription } from "@domain/entities/Transcription";
import { v4 as uuid } from "uuid";

const REALTIME_TOKEN_TTL = 60; // seconds — minimum allowed by Speechmatics

export interface RealtimeSessionDTO {
  /** Short-lived JWT token the client uses to connect to Speechmatics WebSocket. */
  token: string;
  /** WebSocket URL the client should connect to (e.g. wss://eu2.rt.speechmatics.com/v2/). */
  wsUrl: string;
  /** Token TTL in seconds so the client knows when it expires. */
  ttl: number;
  /** ID de la transcripción creada en estado 'pending'. El cliente debe llamar POST /transcriptions/realtime/{id}/save al terminar para persistir. */
  transcriptionId: string;
}

/**
 * Caso de uso que crea una sesión temporal para transcripción en tiempo real.
 *
 * Crea un registro Transcription en estado 'pending' para que el historial
 * pueda incluir la sesión una vez el cliente llame a SaveRealtimeTranscription
 * con el contenido transcrito.
 *
 * Flujo:
 * 1. Frontend llama a POST /transcriptions/realtime (con Bearer token de Cognito).
 * 2. Este use case crea Transcription pending, obtiene token de Speechmatics.
 * 3. Devuelve { token, wsUrl, ttl, transcriptionId } al frontend.
 * 4. Frontend conecta al WebSocket, transcribe, y al terminar llama POST /transcriptions/realtime/{id}/save con { content }.
 */
export class CreateRealtimeSessionUseCase {
  constructor(
    private readonly externalApiService: IExternalApiService,
    private readonly transcriptionRepository: ITranscriptionRepository
  ) {}

  /**
   * Genera un token temporal y crea un registro de transcripción pending.
   *
   * @param userId - ID del usuario autenticado.
   * @returns DTO con token, wsUrl, ttl y transcriptionId.
   * @throws Error Si la creación del token falla en Speechmatics.
   */
  public async execute(userId: string): Promise<RealtimeSessionDTO> {
    const transcriptionId = uuid();
    const now = new Date();
    const transcription = new Transcription(
      transcriptionId,
      userId,
      "realtime-session",
      0,
      "pending",
      "",
      "",
      now,
      now
    );
    await this.transcriptionRepository.save(transcription);

    const { token, wsUrl } = await this.externalApiService.createRealtimeToken(
      REALTIME_TOKEN_TTL
    );

    return {
      token,
      wsUrl,
      ttl: REALTIME_TOKEN_TTL,
      transcriptionId,
    };
  }
}
