import type { APIGatewayProxyResult } from "aws-lambda";

/** Orígenes permitidos para CORS. Access-Control-Allow-Origin solo admite un valor por respuesta. */
export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://transcription-app-client.vercel.app",
] as const;

/** Cabeceras CORS base (sin Origin). */
const corsHeadersBase = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Credentials": true as const,
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

/** Cabeceras CORS con * (para uso sin request, p. ej. webhooks server-to-server). */
export const corsHeaders = {
  ...corsHeadersBase,
  "Access-Control-Allow-Origin": "*",
};

function resolveAllowOrigin(origin?: string | null): string | undefined {
  if (!origin) {
    return "*"; // server-to-server (webhooks): sin Origin
  }
  return ALLOWED_ORIGINS.includes(origin as (typeof ALLOWED_ORIGINS)[number])
    ? origin
    : undefined; // origen no permitido: omitir header, el navegador bloqueará
}

/** Extrae el header Origin del evento para CORS. */
export function getRequestOrigin(event: { headers?: Record<string, string | undefined> }): string | undefined {
  return event.headers?.Origin ?? event.headers?.origin ?? undefined;
}

/**
 * Genera una respuesta HTTP con cabeceras CORS por defecto.
 * @param statusCode - Código de estado HTTP
 * @param body - Cuerpo de la respuesta (objeto se serializa a JSON, string se usa tal cual)
 * @param options - event: para extraer Origin (CORS dinámico). headers: cabeceras adicionales.
 */
export function apiResponse(
  statusCode: number,
  body: string | object,
  options?: {
    event?: { headers?: Record<string, string | undefined> };
    headers?: Record<string, string | boolean>;
  }
): APIGatewayProxyResult {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  const origin = options?.event ? getRequestOrigin(options.event) : undefined;
  const allowOrigin = resolveAllowOrigin(origin);
  const headers: Record<string, string | boolean> = {
    ...corsHeadersBase,
    ...options?.headers,
  };
  if (allowOrigin) {
    headers["Access-Control-Allow-Origin"] = allowOrigin;
  }
  return { statusCode, body: bodyStr, headers };
}
