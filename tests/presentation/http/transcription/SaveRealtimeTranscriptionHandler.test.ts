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
  "../../../../api/src/infrastructure/adapters/storage/storageServiceInstance",
  () => ({
    storageService: {
      generatePresignedUrl: jest.fn(),
      generateDownloadPresignedUrl: jest.fn(),
      deleteFile: jest.fn(),
      getFile: jest.fn(),
    },
  }),
);

jest.mock(
  "../../../../api/src/application/use-cases/transcription/SaveRealtimeTranscriptionUseCase",
  () => ({
    SaveRealtimeTranscriptionUseCase: jest.fn().mockImplementation(() => ({
      execute: mockExecute,
    })),
  }),
);

jest.mock("../../../../api/src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../api/src/presentation/http/transcription/SaveRealtimeTranscriptionHandler";

describe("SaveRealtimeTranscriptionHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockExecute.mockResolvedValue({
      transcriptionId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      status: "completed",
    });
  });

  const createEvent = (
    pathParams: Record<string, string> | null,
    body: Record<string, unknown> = {},
    contentType = "application/json",
    headers: Record<string, string> = {},
  ): APIGatewayProxyEvent =>
    ({
      body: JSON.stringify(body),
      headers: {
        Authorization: "Bearer token",
        "Content-Type": contentType,
        ...headers,
      },
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/transcriptions/realtime/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/save",
      pathParameters: pathParams,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 200 on successful save with JSON body", async () => {
    const audioBase64 = Buffer.from("fake-audio-data").toString("base64");
    const event = createEvent(
      { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
      {
        content: "Transcripción en tiempo real",
        audioBase64,
        fileName: "realtime.mp3",
        duration: 90,
      },
    );
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    const parsed = JSON.parse(result!.body ?? "{}");
    expect(parsed.transcriptionId).toBe("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    expect(parsed.status).toBe("completed");
    expect(mockExecute).toHaveBeenCalledWith(
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "user-123",
      "Transcripción en tiempo real",
      expect.any(Buffer),
      "audio/webm",
      "realtime.mp3",
      90,
    );
  });

  it("returns 401 when Authorization header is missing", async () => {
    const event = createEvent(
      { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
      {},
      "application/json",
      { Authorization: "" },
    );
    (event.headers as Record<string, string>).Authorization = "";
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });

  it("returns 400 when transcription id is missing in path", async () => {
    const event = createEvent(null, {
      content: "text",
      audioBase64: "dGVzdA==",
    });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
  });

  it("returns 400 when content is empty", async () => {
    const event = createEvent(
      { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
      { content: "", audioBase64: "dGVzdA==" },
    );
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
  });

  it("returns 400 when audioFile is missing (JSON path without audioBase64)", async () => {
    const event = createEvent(
      { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
      { content: "text" },
    );
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
  });

  it("returns 401 when token is invalid", async () => {
    mockValidateToken.mockRejectedValue(new Error("Token expired"));
    const event = createEvent(
      { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
      { content: "text", audioBase64: Buffer.from("x").toString("base64") },
    );
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });

  it("returns 404 when transcription not found", async () => {
    const { NotFoundError } = await import("../../../../api/src/shared/errors");
    mockExecute.mockRejectedValue(
      new NotFoundError(
        "Transcripción",
        "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      ),
    );
    const event = createEvent(
      { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
      { content: "text", audioBase64: Buffer.from("x").toString("base64") },
    );
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(404);
  });
});
