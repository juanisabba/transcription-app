import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DeleteTranscriptionUseCase } from "../../../application/use-cases/transcription/DeleteTranscriptionUseCase";
import { transcriptionRepository } from "../../../infrastructure/repositories/transcriptionRepositoryInstance";
import { storageService } from "../../../infrastructure/adapters/storage/storageServiceInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import {
  AppError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../../shared/errors";
import { getBearerToken } from "../../../shared/utils/auth";
import { isValidUuidV4 } from "../../../shared/utils/validation";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new DeleteTranscriptionUseCase(transcriptionRepository, storageService);

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

    const transcriptionId = event.pathParameters?.id;
    if (!transcriptionId || transcriptionId.trim() === "") {
      return apiResponse(400, {
        code: "VALIDATION_ERROR",
        message: "transcriptionId es requerido",
      }, { event });
    }
    if (!isValidUuidV4(transcriptionId)) {
      return apiResponse(400, {
        code: "VALIDATION_ERROR",
        message: "transcriptionId tiene formato inválido",
      }, { event });
    }

    if (!userId || userId.trim() === "") {
      return apiResponse(401, {
        code: "UNAUTHORIZED",
        message: "userId es requerido",
      }, { event });
    }

    await useCase.execute(userId, transcriptionId);

    return apiResponse(204, "", { event });
  } catch (error) {
    console.error("DeleteHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return apiResponse(401, {
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      }, { event });
    }

    if (error instanceof ForbiddenError) {
      return apiResponse(403, { code: error.code, message: error.message }, { event });
    }

    if (error instanceof NotFoundError) {
      return apiResponse(404, { code: error.code, message: error.message }, { event });
    }

    if (error instanceof ValidationError) {
      return apiResponse(400, { code: error.code, message: error.message }, { event });
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
