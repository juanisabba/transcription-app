import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { CreateRealtimeSessionUseCase } from "../../../application/use-cases/transcription/CreateRealtimeSessionUseCase";
import { speechMaticsAdapter } from "../../../infrastructure/adapters/external-services/speechMaticsAdapterInstance";
import { transcriptionRepository } from "../../../infrastructure/repositories/transcriptionRepositoryInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new CreateRealtimeSessionUseCase(speechMaticsAdapter, transcriptionRepository);

function getBearerToken(event: { headers?: Record<string, string | undefined> }): string | null {
  const auth = event.headers?.Authorization ?? event.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }
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
export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    const token = getBearerToken(event);
    if (!token) {
      return apiResponse(401, {
        code: "UNAUTHORIZED",
        message: "Falta el header de autorización",
      }, { event });
    }

    const claims = await authService.validateToken(token);
    const userId = claims.sub;

    const result = await useCase.execute(userId);

    return apiResponse(200, result, { event });
  } catch (error) {
    console.error("RealtimeSessionHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return apiResponse(401, {
        code: "UNAUTHORIZED",
        message: "Token inválido o expirado",
      });
    }

    if (error instanceof AppError) {
      return apiResponse(error.statusCode, { code: error.code, message: error.message }, { event });
    }

    return apiResponse(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor",
    }, { event });
  }
};
