import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { GetStatsUseCase } from "../../../application/use-cases/transcription/GetStatsUseCase";
import { transcriptionRepository } from "../../../infrastructure/repositories/transcriptionRepositoryInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";
import { getBearerToken } from "../../../shared/utils/auth";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new GetStatsUseCase(transcriptionRepository);

/**
 * GET /transcriptions/stats
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

    return apiResponse(200, {
      totalBatchSeconds: result.totalBatchSeconds,
      totalRealtimeSeconds: result.totalRealtimeSeconds,
    }, { event });
  } catch (error) {
    console.error("StatsHandler error:", error);

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
