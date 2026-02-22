import type { IRealtimeTokenProvider } from "../../../application/ports/IRealtimeTokenProvider";

const SPEECHMATICS_MANAGEMENT_URL =
  process.env.SPEECHMATICS_MANAGEMENT_URL ?? "https://mp.speechmatics.com/v1";

const SPEECHMATICS_RT_WS_URL =
  process.env.SPEECHMATICS_RT_WS_URL ?? "wss://eu2.rt.speechmatics.com/v2/";

const CACHE_TTL_SECONDS = 3600; // 60 minutos
const TOKEN_REQUEST_TTL = 3600; // TTL solicitado a Speechmatics (60 min)

interface SpeechmaticsTokenResponse {
  key_value: string;
}

interface CachedToken {
  token: string;
  wsUrl: string;
  expiresAt: number;
}

/**
 * Adapter para obtener tokens de sesión en tiempo real de Speechmatics.
 *
 * Usa la Management API (api_keys) para generar tokens temporales.
 * Cachea el token durante 60 minutos para reducir llamadas a la API.
 */
export class SpeechMaticsRealtimeAdapter implements IRealtimeTokenProvider {
  private cache: CachedToken | null = null;

  async getRealtimeToken(userId: string): Promise<{
    token: string;
    wsUrl: string;
    expiresIn: number;
  }> {
    const now = Date.now();
    const cached = this.cache;

    if (cached && cached.expiresAt > now + 60000) {
      const expiresIn = Math.max(0, Math.floor((cached.expiresAt - now) / 1000));
      return {
        token: cached.token,
        wsUrl: cached.wsUrl,
        expiresIn,
      };
    }

    const apiKey = process.env.SPEECHMATICS_API_KEY;
    if (!apiKey) {
      throw new Error(
        "SPEECHMATICS_API_KEY no está configurada. Configura la variable de entorno."
      );
    }

    const url = `${SPEECHMATICS_MANAGEMENT_URL}/api_keys?type=rt`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl: TOKEN_REQUEST_TTL }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const errMsg = `Speechmatics realtime token failed: ${response.status} ${body}`;
      console.error("[SpeechMaticsRealtimeAdapter]", errMsg);
      throw new Error(errMsg);
    }

    const data = (await response.json()) as SpeechmaticsTokenResponse;

    if (!data.key_value) {
      console.error("[SpeechMaticsRealtimeAdapter] Respuesta sin key_value:", data);
      throw new Error("Speechmatics no devolvió un token válido");
    }

    const expiresAt = now + CACHE_TTL_SECONDS * 1000;
    this.cache = {
      token: data.key_value,
      wsUrl: SPEECHMATICS_RT_WS_URL,
      expiresAt,
    };

    return {
      token: data.key_value,
      wsUrl: SPEECHMATICS_RT_WS_URL,
      expiresIn: CACHE_TTL_SECONDS,
    };
  }
}
