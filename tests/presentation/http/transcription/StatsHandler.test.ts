import type { APIGatewayProxyEvent, Context } from "aws-lambda";

const mockValidateToken = jest.fn();
const mockExecute = jest.fn();

jest.mock(
  "../../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance",
  () => ({
    transcriptionRepository: {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }),
);

jest.mock(
  "../../../../api/src/application/use-cases/transcription/GetStatsUseCase",
  () => ({
    GetStatsUseCase: jest.fn().mockImplementation(() => ({
      execute: mockExecute,
    })),
  }),
);

jest.mock("../../../../api/src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../api/src/presentation/http/transcription/StatsHandler";

describe("StatsHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockExecute.mockResolvedValue({
      totalBatchSeconds: 300,
      totalRealtimeSeconds: 120,
    });
  });

  const createEvent = (
    headers: Record<string, string> = {},
  ): APIGatewayProxyEvent =>
    ({
      body: null,
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "GET",
      isBase64Encoded: false,
      path: "/transcriptions/stats",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 200 with stats on success", async () => {
    const event = createEvent();
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    const parsed = JSON.parse(result!.body ?? "{}");
    expect(parsed.totalBatchSeconds).toBe(300);
    expect(parsed.totalRealtimeSeconds).toBe(120);
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
