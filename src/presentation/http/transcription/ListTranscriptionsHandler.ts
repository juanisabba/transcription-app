import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { ListTranscriptionsUseCase } from "../../../application/use-cases/transcription/ListTranscriptionsUseCase";
import { transcriptionRepository } from "../../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AppError, UnauthorizedError } from "../../../shared/errors";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new ListTranscriptionsUseCase(transcriptionRepository);

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

    const pageParam = event.queryStringParameters?.page;
    const pageSizeParam = event.queryStringParameters?.pageSize;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : 10;

    const result = await useCase.execute(userId, page, pageSize);

    return {
      statusCode: 200,
      body: JSON.stringify({
        items: result.items.map((t) => ({
          id: t.id,
          fileName: t.fileName,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          content: t.status === "completed" ? t.content : undefined,
        })),
        hasMore: result.hasMore,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
      }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("ListTranscriptionsHandler error:", error);

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
