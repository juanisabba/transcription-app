import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { GetRealtimeTokenUseCase } from "../../../application/use-cases/transcription/GetRealtimeTokenUseCase";
import { speechMaticsRealtimeAdapter } from "../../../infrastructure/adapters/external-services/speechMaticsRealtimeAdapterInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";
import { getBearerToken } from "../../../shared/utils/auth";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new GetRealtimeTokenUseCase(speechMaticsRealtimeAdapter);

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
    console.error("RealtimeTokenHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return apiResponse(401, {
        code: "UNAUTHORIZED",
        message: "Token inválido o expirado",
      }, { event });
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
