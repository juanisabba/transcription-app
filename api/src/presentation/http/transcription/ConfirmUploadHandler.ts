import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { StartTranscriptionUseCase } from "../../../application/use-cases/transcription/StartTranscriptionUseCase";
import { transcriptionRepository } from "../../../infrastructure/repositories/transcriptionRepositoryInstance";
import { jobMappingRepository } from "../../../infrastructure/repositories/jobMappingRepositoryInstance";
import { speechMaticsAdapter } from "../../../infrastructure/adapters/external-services/speechMaticsAdapterInstance";
import { storageService } from "../../../infrastructure/adapters/storage/storageServiceInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";
import { isValidUuidV4 } from "../../../shared/utils/validation";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new StartTranscriptionUseCase(
  transcriptionRepository,
  jobMappingRepository,
  speechMaticsAdapter,
  storageService
);

function getBearerToken(event: { headers?: Record<string, string | undefined> }): string | null {
  const auth = event.headers?.Authorization ?? event.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    return null;
  }
  const token = auth.slice(7).trim();
  return token || null;
}

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

    let duration: number | undefined;
    try {
      const body = JSON.parse(event.body ?? "{}") as { duration?: number };
      if (typeof body.duration === "number" && body.duration >= 0) {
        duration = body.duration;
      }
    } catch {
      // body vacío o inválido, duration queda undefined
    }

    const transcription = await transcriptionRepository.findById(transcriptionId, userId);
    if (!transcription) {
      return apiResponse(404, {
        code: "NOT_FOUND",
        message: `Transcripción ${transcriptionId} no encontrada`,
      }, { event });
    }

    await useCase.execute(userId, transcriptionId, transcription.s3Path, "en", duration);

    return apiResponse(200, { id: transcriptionId, status: "processing" }, { event });
  } catch (error) {
    console.error("ConfirmUploadHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return apiResponse(401, { code: "UNAUTHORIZED", message: "Token inválido o expirado" }, { event });
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
