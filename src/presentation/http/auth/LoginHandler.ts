import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { LoginUserUC } from "../../../application/use-cases/auth/LoginUserUC";
import type { LoginUserDTO } from "../../../application/dto/auth";
import { AppError, ValidationError } from "../../../shared/errors";
import { InvalidCredentialsException } from "../../../domain/exceptions";
import { CognitoAuthAdapter } from "../../../infrastructure/adapters/auth";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { userRepository } from "../../../../api/src/infrastructure/repositories/userRepositoryInstance";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

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

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("LoginHandler error:", error);

    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({ code: error.code, message: error.message }),
        headers: corsHeaders,
      };
    }

    if (error instanceof InvalidCredentialsException) {
      return {
        statusCode: 401,
        body: JSON.stringify({ code: "INVALID_CREDENTIALS", message: error.message }),
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

    if (error instanceof Error && error.name === "ValidationError") {
      return {
        statusCode: 400,
        body: JSON.stringify({ code: "VALIDATION_ERROR", message: error.message }),
        headers: corsHeaders,
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ code: "INTERNAL_SERVER_ERROR", message: "Error interno del servidor" }),
      headers: corsHeaders,
    };
  }
};
