import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { AppError } from "../../../shared/errors";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export const handler: APIGatewayProxyHandler = async (
  event,
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || "{}") as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    const { PasswordService } =
      await import("@domain/services/PasswordService");
    const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
    const { DynamoDBDocumentClient } = await import("@aws-sdk/lib-dynamodb");
    const { CognitoIdentityProviderClient } =
      await import("@aws-sdk/client-cognito-identity-provider");
    const { UserRepository } =
      await import("@infrastructure/repositories/UserRepository");
    const { CognitoAuthAdapter } =
      await import("@infrastructure/adapters/auth/CognitoAuthAdapter");
    const { RegisterUserUC } =
      await import("@application/use-cases/auth/RegisterUserUC");

    const dynamodbClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "eu-north-1",
    });
    const docClient = DynamoDBDocumentClient.from(dynamodbClient);
    const userRepository = new UserRepository(docClient);
    const cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || "eu-north-1",
    });
    const authService = new CognitoAuthAdapter(cognitoClient);
    const passwordService = new PasswordService();
    const useCase = new RegisterUserUC(
      userRepository,
      authService,
      passwordService,
    );

    const result = await useCase.execute({
      email,
      password,
    });

    return {
      statusCode: 201,
      body: JSON.stringify(result),
      headers: corsHeaders,
    };
  } catch (error) {
    console.error("RegisterHandler error:", error);

    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({ code: error.code, message: error.message }),
        headers: corsHeaders,
      };
    }

    if (error instanceof Error) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        }),
        headers: corsHeaders,
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error desconocido",
      }),
      headers: corsHeaders,
    };
  }
};
