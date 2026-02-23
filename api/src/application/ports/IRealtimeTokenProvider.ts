/**
 * Port para obtener tokens temporales de Speechmatics Realtime API.
 */
export interface IRealtimeTokenProvider {
  getRealtimeToken(userId: string): Promise<{
    token: string;
    wsUrl: string;
    expiresIn: number;
  }>;
}
