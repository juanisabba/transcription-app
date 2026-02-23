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
  "../../../../api/src/application/use-cases/transcription/DeleteTranscriptionUseCase",
  () => ({
    DeleteTranscriptionUseCase: jest.fn().mockImplementation(() => ({
      execute: mockExecute,
    })),
  }),
);

jest.mock("../../../../api/src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../api/src/presentation/http/transcription/DeleteHandler";

describe("DeleteHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockExecute.mockResolvedValue(undefined);
  });

  const createEvent = (
    pathParams: Record<string, string> | null,
    headers: Record<string, string> = {},
  ): APIGatewayProxyEvent =>
    ({
      body: null,
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "DELETE",
      isBase64Encoded: false,
      path: "/transcriptions/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      pathParameters: pathParams,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 204 on successful delete", async () => {
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(204);
    expect(result!.body).toBe("");
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

  it("returns 400 when transcription id has invalid UUID format", async () => {
    const event = createEvent({ id: "invalid-id" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
    const parsed = JSON.parse(result!.body ?? "{}");
    expect(parsed.message).toContain("formato inválido");
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
});
