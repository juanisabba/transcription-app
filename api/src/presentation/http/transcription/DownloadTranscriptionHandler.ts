import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DownloadTranscriptionUseCase } from "../../../application/use-cases/transcription/DownloadTranscriptionUseCase";
import { transcriptionRepository } from "../../../infrastructure/repositories/transcriptionRepositoryInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, NotFoundError, UnauthorizedError } from "../../../shared/errors";
import { getBearerToken } from "../../../shared/utils/auth";
import { isValidUuidV4 } from "../../../shared/utils/validation";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new DownloadTranscriptionUseCase(transcriptionRepository);

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
        message: "Falta el id de transcripción en la ruta",
      }, { event });
    }
    if (!isValidUuidV4(transcriptionId)) {
      return apiResponse(400, {
        code: "VALIDATION_ERROR",
        message: "transcriptionId tiene formato inválido",
      }, { event });
    }

    const result = await useCase.execute(userId, transcriptionId);

    return apiResponse(200, result.content, {
      event,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${result.fileName}.txt"`,
      },
    });
  } catch (error) {
    console.error("DownloadTranscriptionHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return apiResponse(401, { code: "UNAUTHORIZED", message: "Token inválido o expirado" }, { event });
    }

    if (error instanceof NotFoundError) {
      return apiResponse(404, { code: error.code, message: error.message }, { event });
    }

    if (error instanceof AppError) {
      return apiResponse(error.statusCode, { code: error.code, message: error.message }, { event });
    }

    if (error instanceof Error && error.message.includes("no está lista para descargar")) {
      return apiResponse(422, {
        code: "TRANSCRIPTION_NOT_READY",
        message: error.message,
      }, { event });
    }

    return apiResponse(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor",
    }, { event });
  }
};
