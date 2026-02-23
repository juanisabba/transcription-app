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

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new StartTranscriptionUseCase(
  transcriptionRepository,
  jobMappingRepository,
  speechMaticsAdapter,
  storageService
);

function getBearerToken(event: { headers?: Record<string, string | undefined> }): string | null {
  const auth = event.headers?.Authorization ?? event.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

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

    const transcriptionId = event.pathParameters?.id;
    if (!transcriptionId || transcriptionId.trim() === "") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "VALIDATION_ERROR",
          message: "Falta el id de transcripción en la ruta",
        }),
        headers: corsHeaders,
      };
    }
    if (!isValidUuidV4(transcriptionId)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "VALIDATION_ERROR",
          message: "transcriptionId tiene formato inválido",
        }),
        headers: corsHeaders,
      };
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
      return {
        statusCode: 404,
        body: JSON.stringify({
          code: "NOT_FOUND",
          message: `Transcripción ${transcriptionId} no encontrada`,
        }),
        headers: corsHeaders,
      };
    }

    await useCase.execute(userId, transcriptionId, transcription.s3Path, "en", duration);

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: transcriptionId,
        status: "processing",
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("ConfirmUploadHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({ code: "UNAUTHORIZED", message: "Token inválido o expirado" }),
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
