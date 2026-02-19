import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { CreateRealtimeSessionUseCase } from "../../../application/use-cases/transcription/CreateRealtimeSessionUseCase";
import { speechMaticsAdapter } from "../../../../api/src/infrastructure/adapters/external-services/speechMaticsAdapterInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new CreateRealtimeSessionUseCase(speechMaticsAdapter);

function getBearerToken(
  event: { headers?: Record<string, string | undefined> }
): string | null {
  const auth =
    event.headers?.Authorization ?? event.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

/**
 * POST /transcriptions/realtime
 *
 * Crea un token temporal de Speechmatics Realtime API para que el cliente
 * pueda abrir una conexión WebSocket directa sin exponer la API key principal.
 *
 * Respuesta:
 * {
 *   "token": "<short-lived JWT>",
 *   "wsUrl": "wss://eu2.rt.speechmatics.com/v2/",
 *   "ttl": 60
 * }
 */
export const handler: APIGatewayProxyHandler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    const token = getBearerToken(event);
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          code: "UNAUTHORIZED",
          message: "Missing Authorization header",
        }),
        headers: corsHeaders,
      };
    }

    await authService.validateToken(token);

    const result = await useCase.execute();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("RealtimeSessionHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          code: "UNAUTHORIZED",
          message: "Invalid or expired token",
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
        message: "Internal Server Error",
      }),
      headers: corsHeaders,
    };
  }
};
