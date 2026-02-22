import type { APIGatewayProxyEvent, Context } from "aws-lambda";

const mockValidateToken = jest.fn();
const mockExecute = jest.fn();

jest.mock("../../../../api/src/infrastructure/adapters/external-services/speechMaticsAdapterInstance", () => ({
  speechMaticsAdapter: {
    startTranscription: jest.fn(),
    getTranscriptionResult: jest.fn(),
  },
}));

jest.mock("../../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance", () => ({
  transcriptionRepository: {
    save: jest.fn(),
    findById: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../../src/application/use-cases/transcription/CreateRealtimeSessionUseCase", () => ({
  CreateRealtimeSessionUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

jest.mock("../../../../src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../src/presentation/http/transcription/RealtimeSessionHandler";

describe("RealtimeSessionHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockExecute.mockResolvedValue({
      token: "session-jwt-token",
      wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      ttl: 60,
    });
  });

  const createEvent = (headers: Record<string, string> = {}): APIGatewayProxyEvent =>
    ({
      body: null,
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/transcriptions/realtime",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 200 with token, wsUrl and ttl on success", async () => {
    const event = createEvent();
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    const parsed = JSON.parse(result!.body ?? "{}");
    expect(parsed.token).toBe("session-jwt-token");
    expect(parsed.wsUrl).toBe("wss://eu2.rt.speechmatics.com/v2/");
    expect(parsed.ttl).toBe(60);
    expect(mockExecute).toHaveBeenCalledWith("user-123");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const event = createEvent({ Authorization: "" });
    (event.headers as Record<string, string>).Authorization = "";
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    mockValidateToken.mockRejectedValue(new Error("Token expired"));
    const event = createEvent();
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });
});
