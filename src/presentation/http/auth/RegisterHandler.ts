import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (
  event,
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("[TEST] 1. Handler called");

    const body = JSON.parse(event.body || "{}");
    console.log("[TEST] 2. Body parsed");

    console.log("[TEST] 3. Importing all services...");
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
    console.log("[TEST] 4. All imports done");

    console.log("[TEST] 5. Creating DynamoDB client...");
    const dynamodbClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "eu-north-1",
    });
    console.log(`[DynamoDB] Conectando a: AWS DynamoDB (${process.env.AWS_REGION || "eu-north-1"})`);
    const docClient = DynamoDBDocumentClient.from(dynamodbClient);
    console.log("[TEST] 6. DynamoDB client created");

    console.log("[TEST] 7. Creating UserRepository...");
    const userRepository = new UserRepository(docClient);
    console.log("[TEST] 8. UserRepository created");

    console.log("[TEST] 9. Creating Cognito client...");
    const cognitoClient = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || "eu-north-1",
    });
    console.log("[TEST] 10. Cognito client created");

    console.log("[TEST] 11. Creating CognitoAuthAdapter...");
    const authService = new CognitoAuthAdapter(cognitoClient);
    console.log("[TEST] 12. CognitoAuthAdapter created");

    console.log("[TEST] 13. Creating PasswordService...");
    const passwordService = new PasswordService();
    console.log("[TEST] 14. PasswordService created");

    console.log("[TEST] 15. Creating RegisterUserUC...");
    const useCase = new RegisterUserUC(
      userRepository,
      authService,
      passwordService,
    );
    console.log("[TEST] 16. RegisterUserUC created");

    console.log("[TEST] 17. Executing useCase...");
    const result = await useCase.execute({
      email: body.email,
      password: body.password,
    });
    console.log("[TEST] 18. useCase executed successfully");

    return {
      statusCode: 201,
      body: JSON.stringify(result),
      headers: { "Content-Type": "application/json" },
    };
  } catch (error) {
    console.error("[TEST] Error:", error);
    console.error(
      "[TEST] Error details:",
      error instanceof Error ? error.message : String(error),
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: String(error),
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
