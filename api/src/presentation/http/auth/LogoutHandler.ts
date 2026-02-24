import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { LogoutUserUC } from "../../../application/use-cases/auth/LogoutUserUC";
import { AppError, UnauthorizedError } from "../../../shared/errors";
import { getBearerToken } from "../../../shared/utils/auth";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new LogoutUserUC(authService);

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    const token = getBearerToken(event);
    if (!token) {
      return apiResponse(401, { code: "UNAUTHORIZED", message: "Falta el header de autorización" }, { event });
    }

    const claims = await authService.validateToken(token);
    const userId = claims.sub;

    await useCase.execute(userId);

    return apiResponse(200, { message: "Cierre de sesión exitoso" }, { event });
  } catch (error) {
    console.error("LogoutHandler error:", error);

    if (error instanceof AppError) {
      return apiResponse(error.statusCode, { code: error.code, message: error.message }, { event });
    }

    if (error instanceof UnauthorizedError) {
      return apiResponse(401, { code: error.code, message: error.message }, { event });
    }

    return apiResponse(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor",
    }, { event });
  }
};
