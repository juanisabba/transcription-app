import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { LogoutUserUC } from "../../../application/use-cases/auth/LogoutUserUC";
import { AppError, UnauthorizedError } from "../../../shared/errors";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new LogoutUserUC(authService);

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
        body: JSON.stringify({ code: "UNAUTHORIZED", message: "Missing Authorization header" }),
        headers: corsHeaders,
      };
    }

    const claims = await authService.validateToken(token);
    const userId = claims.sub;

    await useCase.execute(userId);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Logout successful" }),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("LogoutHandler error:", error);

    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({ code: error.code, message: error.message }),
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

    return {
      statusCode: 500,
      body: JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" }),
      headers: corsHeaders,
    };
  }
};
