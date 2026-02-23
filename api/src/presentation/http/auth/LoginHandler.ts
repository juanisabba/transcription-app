import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { LoginUserUC } from "../../../application/use-cases/auth/LoginUserUC";
import type { LoginUserDTO } from "../../../application/dto/auth";
import { AppError, ValidationError } from "../../../shared/errors";
import { InvalidCredentialsException } from "../../../domain/exceptions";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { userRepository } from "../../../infrastructure/repositories/userRepositoryInstance";
import { apiResponse } from "../helpers/responseHelper";

const authService = new CognitoAuthAdapter(new CognitoIdentityProviderClient({}));
const useCase = new LoginUserUC(userRepository, authService);

export const handler: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body ?? "{}") as Record<string, unknown>;
    const request: LoginUserDTO = {
      email: typeof body.email === "string" ? body.email : "",
      password: typeof body.password === "string" ? body.password : "",
    };

    const result = await useCase.execute(request);

    return apiResponse(200, result, { event });
  } catch (error) {
    console.error("LoginHandler error:", error);

    if (error instanceof AppError) {
      return apiResponse(error.statusCode, { code: error.code, message: error.message }, { event });
    }

    if (error instanceof InvalidCredentialsException) {
      return apiResponse(401, { code: "INVALID_CREDENTIALS", message: error.message }, { event });
    }

    if (error instanceof ValidationError) {
      return apiResponse(400, { code: error.code, message: error.message }, { event });
    }

    if (error instanceof Error && error.name === "ValidationError") {
      return apiResponse(400, { code: "VALIDATION_ERROR", message: error.message }, { event });
    }

    return apiResponse(500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor",
    }, { event });
  }
};
