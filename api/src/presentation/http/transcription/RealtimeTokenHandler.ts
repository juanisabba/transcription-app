import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { GetRealtimeTokenUseCase } from "../../../application/use-cases/transcription/GetRealtimeTokenUseCase";
import { speechMaticsRealtimeAdapter } from "../../../infrastructure/adapters/external-services/speechMaticsRealtimeAdapterInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new GetRealtimeTokenUseCase(speechMaticsRealtimeAdapter);

function getBearerToken(event: { headers?: Record<string, string | undefined> }): string | null {
  const auth = event.headers?.Authorization ?? event.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }
  const token = auth.slice(7).trim();
  return token || null;
}

/**
 * POST /transcriptions/realtime/token
 *
 * Obtiene un token temporal de Speechmatics para conexión WebSocket en tiempo real.
 * El token permite al cliente conectar directamente sin exponer la API key.
 *
 * Respuesta:
 * {
 *   "token": "<short-lived JWT>",
 *   "wsUrl": "wss://eu2.rt.speechmatics.com/v2/",
 *   "expiresIn": 3600
 * }
 */
export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    const token = getBearerToken(event);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          code: "UNAUTHORIZED",
          message: "Falta el header de autorización",
        }),
        headers: corsHeaders,
      };
    }

    const claims = await authService.validateToken(token);
    const userId = claims.sub;

    const result = await useCase.execute(userId);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("RealtimeTokenHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          code: "UNAUTHORIZED",
          message: "Token inválido o expirado",
        }),
        headers: corsHeaders,
      };
    }

    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({ code: error.code, message: error.message }),
        headers: corsHeaders,
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error interno del servidor",
      }),
      headers: corsHeaders,
    };
  }
};
