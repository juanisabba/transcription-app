import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { StartTranscriptionUseCase } from "../../../application/use-cases/transcription/StartTranscriptionUseCase";
import { transcriptionRepository } from "../../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance";
import { jobMappingRepository } from "../../../../api/src/infrastructure/repositories/jobMappingRepositoryInstance";
import { speechMaticsAdapter } from "../../../../api/src/infrastructure/adapters/external-services/speechMaticsAdapterInstance";
import { storageService } from "../../../../api/src/infrastructure/adapters/storage/storageServiceInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";

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

function getBearerToken(
  event: { headers?: Record<string, string | undefined> }
): string | null {
  const auth =
    event.headers?.Authorization ?? event.headers?.authorization ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

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

    const claims = await authService.validateToken(token);
    const userId = claims.sub;

    const transcriptionId = event.pathParameters?.id;
    if (!transcriptionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          code: "VALIDATION_ERROR",
          message: "Missing transcription id in path",
        }),
        headers: corsHeaders,
      };
    }

    console.log("[Confirm] Recibida confirmación para ID:", transcriptionId);

    const transcription = await transcriptionRepository.findById(
      transcriptionId,
      userId
    );
    if (!transcription) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          code: "NOT_FOUND",
          message: `Transcription ${transcriptionId} not found`,
        }),
        headers: corsHeaders,
      };
    }

    await useCase.execute(userId, transcriptionId, transcription.s3Path);

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

    if (error instanceof UnauthorizedError || (error instanceof Error && error.message.includes("expired"))) {
      return {
        statusCode: 401,
        body: JSON.stringify({ code: "UNAUTHORIZED", message: "Invalid or expired token" }),
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
