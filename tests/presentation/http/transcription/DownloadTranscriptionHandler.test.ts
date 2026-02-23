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
  "../../../../api/src/application/use-cases/transcription/DownloadTranscriptionUseCase",
  () => ({
    DownloadTranscriptionUseCase: jest.fn().mockImplementation(() => ({
      execute: mockExecute,
    })),
  }),
);

jest.mock("../../../../api/src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../api/src/presentation/http/transcription/DownloadTranscriptionHandler";

describe("DownloadTranscriptionHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockExecute.mockResolvedValue({
      content: "Transcripción de ejemplo",
      fileName: "audio.mp3",
    });
  });

  const createEvent = (
    pathParams: Record<string, string> | null,
    headers: Record<string, string> = {},
  ): APIGatewayProxyEvent =>
    ({
      body: null,
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "GET",
      isBase64Encoded: false,
      path: "/transcriptions/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/download",
      pathParameters: pathParams,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 200 with content and download headers on success", async () => {
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    expect(result!.body).toBe("Transcripción de ejemplo");
    expect(result!.headers).toMatchObject({
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audio.mp3.txt"',
    });
    expect(mockExecute).toHaveBeenCalledWith(
      "user-123",
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    );
  });

  it("returns 401 when Authorization header is missing", async () => {
    const event = createEvent(
      { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
      { Authorization: "" },
    );
    (event.headers as Record<string, string>).Authorization = "";
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });

  it("returns 400 when transcription id is missing in path", async () => {
    const event = createEvent(null);
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
  });

  it("returns 404 when transcription not found", async () => {
    const { NotFoundError } = await import("../../../../api/src/shared/errors");
    mockExecute.mockRejectedValue(
      new NotFoundError(
        "Transcripción",
        "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      ),
    );
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(404);
  });

  it("returns 422 when transcription not ready for download", async () => {
    mockExecute.mockRejectedValue(
      new Error("La transcripción no está lista para descargar"),
    );
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(422);
  });

  it("returns 401 when token is invalid", async () => {
    mockValidateToken.mockRejectedValue(new Error("Token expired"));
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });
});
