import type { APIGatewayProxyEvent, Context } from "aws-lambda";

const mockValidateToken = jest.fn();

jest.mock(
  "../../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance",
  () => ({
    transcriptionRepository: {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
    },
  }),
);

jest.mock(
  "../../../../api/src/infrastructure/adapters/storage/storageServiceInstance",
  () => ({
    storageService: {
      generatePresignedUrl: jest
        .fn()
        .mockResolvedValue("https://s3.example.com/presigned"),
      generateDownloadPresignedUrl: jest.fn(),
      deleteFile: jest.fn(),
      getFile: jest.fn(),
    },
  }),
);

jest.mock("../../../../api/src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../api/src/presentation/http/transcription/UploadHandler";

describe("UploadHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
  });

  const createEvent = (
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): APIGatewayProxyEvent =>
    ({
      body: JSON.stringify(body),
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/transcriptions/upload",
      pathParameters: null,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 202 with id, uploadUrl, status and expiresIn on successful request", async () => {
    const event = createEvent({
      fileName: "audio.mp3",
      fileSize: 1024 * 1024,
    });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(202);
    const parsed = JSON.parse(result!.body ?? "{}");
    expect(parsed.id).toBeDefined();
    expect(parsed.uploadUrl).toBe("https://s3.example.com/presigned");
    expect(parsed.status).toBe("pending");
    expect(parsed.expiresIn).toBe(3600);
  });

  it("returns 400 when contentType is not audio/*", async () => {
    const event = createEvent({
      fileName: "video.mp4",
      fileSize: 1024,
      contentType: "video/mp4",
    });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
    const parsed = JSON.parse(result!.body ?? "{}");
    expect(parsed.code).toBe("INVALID_FILE_TYPE");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const event = createEvent(
      { fileName: "audio.mp3", fileSize: 1024 },
      { Authorization: "" },
    );
    (event.headers as Record<string, string>).Authorization = "";
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
  });
});
