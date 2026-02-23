import type { APIGatewayProxyEvent, Context } from "aws-lambda";

const mockValidateToken = jest.fn();
const mockExecute = jest.fn();

jest.mock(
  "../../../../api/src/infrastructure/adapters/external-services/speechMaticsRealtimeAdapterInstance",
  () => ({
    speechMaticsRealtimeAdapter: {
      getToken: mockExecute,
    },
  }),
);

jest.mock(
  "../../../../api/src/application/use-cases/transcription/GetRealtimeTokenUseCase",
  () => ({
    GetRealtimeTokenUseCase: jest.fn().mockImplementation(() => ({
      execute: mockExecute,
    })),
  }),
);

jest.mock("../../../../api/src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../api/src/presentation/http/transcription/RealtimeTokenHandler";

describe("RealtimeTokenHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockExecute.mockResolvedValue({
      token: "realtime-jwt-token",
      wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      expiresIn: 3600,
    });
  });

  const createEvent = (
    headers: Record<string, string> = {},
  ): APIGatewayProxyEvent =>
    ({
      body: null,
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/transcriptions/realtime/token",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 200 with token, wsUrl and expiresIn on success", async () => {
    const event = createEvent();
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    const parsed = JSON.parse(result!.body ?? "{}");
    expect(parsed.token).toBe("realtime-jwt-token");
    expect(parsed.wsUrl).toBe("wss://eu2.rt.speechmatics.com/v2/");
    expect(parsed.expiresIn).toBe(3600);
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
