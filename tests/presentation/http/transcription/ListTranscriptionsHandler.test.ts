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
  })
);

jest.mock("../../../../src/application/use-cases/transcription/ListTranscriptionsUseCase", () => ({
  ListTranscriptionsUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

jest.mock("../../../../src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../src/presentation/http/transcription/ListTranscriptionsHandler";

describe("ListTranscriptionsHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockExecute.mockResolvedValue({
      items: [
        {
          id: "trans-1",
          fileName: "audio.mp3",
          status: "completed",
          createdAt: new Date(),
          updatedAt: new Date(),
          content: "Hello world",
        },
      ],
      hasMore: false,
      totalPages: 1,
      currentPage: 1,
    });
  });

  const createEvent = (
    queryParams: Record<string, string> | null = {},
    headers: Record<string, string> = {}
  ): APIGatewayProxyEvent =>
    ({
      body: null,
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "GET",
      isBase64Encoded: false,
      path: "/transcriptions",
      pathParameters: null,
      queryStringParameters: queryParams,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 200 with items, hasMore, totalPages, currentPage", async () => {
    const event = createEvent({ page: "1", pageSize: "10" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    const body = JSON.parse(result!.body ?? "{}");
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe("trans-1");
    expect(body.hasMore).toBe(false);
    expect(body.totalPages).toBe(1);
    expect(body.currentPage).toBe(1);
    expect(mockExecute).toHaveBeenCalledWith("user-123", 1, 10);
  });

  it("uses default page 1 and pageSize 10 when params missing", async () => {
    const event = createEvent(null);
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    await handler(event, ctx, () => {});

    expect(mockExecute).toHaveBeenCalledWith("user-123", 1, 10);
  });

  it("returns 401 when Authorization header is missing", async () => {
    const event = createEvent({}, { Authorization: "" });
    (event.headers as Record<string, string>).Authorization = "";
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });
});
