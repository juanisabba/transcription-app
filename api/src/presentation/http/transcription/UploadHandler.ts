import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { UploadTranscriptionUseCase } from "../../../application/use-cases/transcription/UploadTranscriptionUseCase";
import type { UploadTranscriptionDTO } from "../../../application/dto/transcription";
import { transcriptionRepository } from "../../../infrastructure/repositories/transcriptionRepositoryInstance";
import { storageService } from "../../../infrastructure/adapters/storage/storageServiceInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, ValidationError, UnauthorizedError } from "../../../shared/errors";
import { isValidFileSize } from "../../../shared/utils/validation";
import { FileTooLargeException, InvalidFileTypeException } from "../../../domain/exceptions";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new UploadTranscriptionUseCase(transcriptionRepository, storageService);

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

    const body = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
    const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;
    if (!isValidFileSize(fileSize)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "VALIDATION_ERROR",
          message:
            fileSize < 0
              ? "fileSize no puede ser negativo"
              : fileSize > 20_971_520
                ? "fileSize excede el límite de 20 MB"
                : "fileSize debe ser un número válido",
        }),
        headers: corsHeaders,
      };
    }

    const request: UploadTranscriptionDTO = {
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      fileSize,
      contentType: typeof body.contentType === "string" ? body.contentType : undefined,
    };

    const result = await useCase.execute(userId, request);

    return {
      statusCode: 202,
      body: JSON.stringify({
        id: result.transcriptionId,
        uploadUrl: result.uploadUrl,
        status: "pending",
        expiresIn: result.expiresIn,
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("UploadHandler error:", error);

    if (
      error instanceof InvalidFileTypeException ||
      (error instanceof Error && error.name === "InvalidFileTypeException")
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "INVALID_FILE_TYPE",
          message: (error as Error).message,
        }),
        headers: corsHeaders,
      };
    }

    if (error instanceof UnauthorizedError) {
      return {
        statusCode: 401,
        body: JSON.stringify({ code: error.code, message: error.message }),
        headers: corsHeaders,
      };
    }

    if (error instanceof FileTooLargeException) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "FILE_TOO_LARGE",
          message: error.message,
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

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
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
