import type { APIGatewayProxyEvent, Context } from "aws-lambda";

const mockValidateToken = jest.fn();
const mockFindById = jest.fn();
const mockExecute = jest.fn();

jest.mock("../../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance", () => ({
  transcriptionRepository: {
    save: jest.fn(),
    findById: mockFindById,
    findByUserId: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../../api/src/infrastructure/repositories/jobMappingRepositoryInstance", () => ({
  jobMappingRepository: {
    save: jest.fn(),
    findByJobId: jest.fn(),
    findByTranscriptionId: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../../../../api/src/infrastructure/adapters/external-services/speechMaticsAdapterInstance", () => ({
  speechMaticsAdapter: {
    startTranscription: jest.fn(),
    getTranscriptionResult: jest.fn(),
  },
}));

jest.mock("../../../../api/src/infrastructure/adapters/storage/storageServiceInstance", () => ({
  storageService: {
    generatePresignedUrl: jest.fn(),
    generateDownloadPresignedUrl: jest.fn(),
    deleteFile: jest.fn(),
    getFile: jest.fn(),
  },
}));

jest.mock("../../../../src/application/use-cases/transcription/StartTranscriptionUseCase", () => ({
  StartTranscriptionUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

jest.mock("../../../../src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../src/presentation/http/transcription/ConfirmUploadHandler";

describe("ConfirmUploadHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockFindById.mockResolvedValue({
      id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      userId: "user-123",
      s3Path: "uploads/user-123/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/audio.mp3",
      status: "pending",
    });
    mockExecute.mockResolvedValue(undefined);
  });

  const createEvent = (
    pathParams: Record<string, string> | null,
    body: Record<string, unknown> = {},
    headers: Record<string, string> = {}
  ): APIGatewayProxyEvent =>
    ({
      body: JSON.stringify(body),
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/transcriptions/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/confirm",
      pathParameters: pathParams,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 200 on successful confirm", async () => {
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" }, { duration: 120 });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    const parsed = JSON.parse(result!.body ?? "{}");
    expect(parsed.id).toBe("a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d");
    expect(parsed.status).toBe("processing");
    expect(mockExecute).toHaveBeenCalledWith(
      "user-123",
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "uploads/user-123/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/audio.mp3",
      "en",
      120
    );
  });

  it("returns 200 with undefined duration when body has no duration", async () => {
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" }, {});
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(
      "user-123",
      "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "uploads/user-123/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d/audio.mp3",
      "en",
      undefined
    );
  });

  it("returns 401 when Authorization header is missing", async () => {
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" }, {}, { Authorization: "" });
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
    mockFindById.mockResolvedValue(null);
    const event = createEvent({ id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(404);
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
