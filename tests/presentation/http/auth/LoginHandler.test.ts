import type { APIGatewayProxyEvent, Context } from "aws-lambda";
const mockAuthenticate = jest.fn();
const mockValidateToken = jest.fn();

jest.mock("../../../../api/src/infrastructure/repositories/userRepositoryInstance", () => ({
  userRepository: {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    updateLastLogin: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../../../src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    authenticateWithPassword: mockAuthenticate,
    validateToken: mockValidateToken,
  })),
}));

// Import handler after mocks (from tests/presentation/http/auth/ -> ../../../../ goes to project root)
import { handler } from "../../../../src/presentation/http/auth/LoginHandler";

describe("LoginHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticate.mockResolvedValue({
      accessToken: "access-token",
      idToken: "id-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
    });
    mockValidateToken.mockResolvedValue({
      sub: "user-123",
      email: "user@example.com",
    });
  });

  const createEvent = (body: Record<string, unknown>): APIGatewayProxyEvent =>
    ({
      body: JSON.stringify(body),
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/auth/login",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 200 with tokens on successful login", async () => {
    const event = createEvent({ email: "user@example.com", password: "SecurePass1!" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    const body = JSON.parse(result!.body ?? "{}");
    expect(body.accessToken).toBe("access-token");
    expect(body.idToken).toBe("id-token");
    expect(body.refreshToken).toBe("refresh-token");
  });

  it("returns 401 when credentials are invalid", async () => {
    const { InvalidCredentialsException } = await import(
      "../../../../src/domain/exceptions/InvalidCredentialsException"
    );
    mockAuthenticate.mockRejectedValueOnce(new InvalidCredentialsException());

    const event = createEvent({ email: "user@example.com", password: "wrong" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });

  it("returns 400 when email is empty", async () => {
    const event = createEvent({ email: "", password: "pass" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
  });
});
