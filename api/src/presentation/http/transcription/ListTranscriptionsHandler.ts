import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { ListTranscriptionsUseCase } from "../../../application/use-cases/transcription/ListTranscriptionsUseCase";
import { transcriptionRepository } from "../../../infrastructure/repositories/transcriptionRepositoryInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";
import { getBearerToken } from "../../../shared/utils/auth";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new ListTranscriptionsUseCase(transcriptionRepository);

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

    const pageParam = event.queryStringParameters?.page;
    const pageSizeParam = event.queryStringParameters?.pageSize;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 10;

    const result = await useCase.execute(userId, page, pageSize);

    return apiResponse(200, {
      items: result.items.map((t) => ({
        id: t.id,
        fileName: t.fileName,
        status: t.status,
        type: t.type,
        duration: t.duration,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        content: t.status === "completed" ? t.content : undefined,
        audioUrl: t.audioUrl,
      })),
      hasMore: result.hasMore,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
    }, { event });
  } catch (error) {
    console.error("ListTranscriptionsHandler error:", error);

    if (
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.message.includes("expired"))
    ) {
      return apiResponse(401, { code: "UNAUTHORIZED", message: "Invalid or expired token" }, { event });
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
