import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DeleteTranscriptionUseCase } from "../../../application/use-cases/transcription/DeleteTranscriptionUseCase";
import { transcriptionRepository } from "../../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance";
import { storageService } from "../../../../api/src/infrastructure/adapters/storage/storageServiceInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, NotFoundError, UnauthorizedError } from "../../../shared/errors";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new DeleteTranscriptionUseCase(
  transcriptionRepository,
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

    await useCase.execute(transcriptionId, userId);

    return {
      statusCode: 204,
      body: "",
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("DeleteHandler error:", error);

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

    if (error instanceof NotFoundError) {
      return {
        statusCode: 404,
        body: JSON.stringify({ code: error.code, message: error.message }),
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
