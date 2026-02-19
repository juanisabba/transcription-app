import {
  CreateTableCommand,
  DeleteItemCommand,
  DescribeTableCommand,
  DynamoDBClient as AWSDynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { RegisterUserUC } from "../../../src/application/use-cases/auth/RegisterUserUC";
import type { RegisterUserDTO } from "../../../src/application/dto/auth";
import { createMockAuthService } from "../../mocks";
import { PasswordService } from "../../../src/domain/services/PasswordService";
import { UserRepository } from "../../../api/src/infrastructure/repositories/UserRepository";

const DYNAMODB_LOCAL_ENDPOINT =
  process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE ?? "vocali-users-dev";

describe("RegisterUserUC Integration", () => {
  let userRepository: UserRepository;
  let docClient: DynamoDBDocumentClient;
  let rawClient: AWSDynamoDBClient;
  const mockAuthService = createMockAuthService();
  const passwordService = new PasswordService();
  let dynamoAvailable = false;

  beforeAll(async () => {
    rawClient = new AWSDynamoDBClient({
      region: "eu-west-1",
      endpoint: DYNAMODB_LOCAL_ENDPOINT,
    });

    try {
      await ensureUsersTableExists(rawClient, USERS_TABLE);
      dynamoAvailable = true;
    } catch (err) {
      console.warn(
        "DynamoDB local not available at",
        DYNAMODB_LOCAL_ENDPOINT,
        "- skipping integration tests. Start with: pnpm --filter api exec serverless dynamodb start"
      );
      return;
    }

    docClient = DynamoDBDocumentClient.from(rawClient);
    userRepository = new UserRepository(docClient);
  });

  afterEach(async () => {
    if (dynamoAvailable) {
      await clearTestUserByEmail("integration-test@example.com");
    }
    jest.restoreAllMocks();
  });

  it("should register user in DynamoDB", async () => {
    if (!dynamoAvailable) return;
    jest.spyOn(passwordService, "hash").mockReturnValue("hashed-password");
    jest.spyOn(passwordService, "isStrongPassword").mockReturnValue(true);
    mockAuthService.register.mockResolvedValue({ userId: "cognito-123" });
    mockAuthService.authenticateWithPassword.mockResolvedValue({
      accessToken: "access-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
    });

    const useCase = new RegisterUserUC(
      userRepository,
      mockAuthService,
      passwordService
    );

    const validRequest: RegisterUserDTO = {
      email: "integration-test@example.com",
      password: "SecurePass1!",
    };

    const result = await useCase.execute(validRequest);

    expect(result.userId).toBeDefined();
    expect(result.email).toBe(validRequest.email);

    const savedUser = await userRepository.findByEmail(validRequest.email);
    expect(savedUser).toBeDefined();
    expect(savedUser?.email).toBe(validRequest.email);
    expect(savedUser?.id).toBe(result.userId);
  });

  async function ensureUsersTableExists(
    client: AWSDynamoDBClient,
    tableName: string
  ): Promise<void> {
    try {
      await client.send(new DescribeTableCommand({ TableName: tableName }));
    } catch {
      await client.send(
        new CreateTableCommand({
          TableName: tableName,
          AttributeDefinitions: [
            { AttributeName: "userId", AttributeType: "S" },
            { AttributeName: "email", AttributeType: "S" },
          ],
          KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
          GlobalSecondaryIndexes: [
            {
              IndexName: "email-index",
              KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
              Projection: { ProjectionType: "ALL" },
              ProvisionedThroughput: {
                ReadCapacityUnits: 5,
                WriteCapacityUnits: 5,
              },
            },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        })
      );
    }
  }

  async function clearTestUserByEmail(email: string): Promise<void> {
    const result = await docClient.send(
      new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: "email-index",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
      })
    );
    const items = result.Items ?? [];
    for (const item of items) {
      const userId = item.userId as string;
      await rawClient.send(
        new DeleteItemCommand({
          TableName: USERS_TABLE,
          Key: { userId: { S: userId } },
        })
      );
    }
  }
});
