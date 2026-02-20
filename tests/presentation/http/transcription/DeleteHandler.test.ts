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

jest.mock(
  "../../../../api/src/infrastructure/adapters/storage/storageServiceInstance",
  () => ({
    storageService: {
      generatePresignedUrl: jest.fn(),
      generateDownloadPresignedUrl: jest.fn(),
      deleteFile: jest.fn(),
      getFile: jest.fn(),
    },
  })
);

jest.mock("../../../../src/application/use-cases/transcription/DeleteTranscriptionUseCase", () => ({
  DeleteTranscriptionUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

jest.mock("../../../../src/infrastructure/adapters/auth", () => ({
  CognitoAuthAdapter: jest.fn().mockImplementation(() => ({
    validateToken: mockValidateToken,
  })),
}));

import { handler } from "../../../../src/presentation/http/transcription/DeleteHandler";

describe("DeleteHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateToken.mockResolvedValue({ sub: "user-123" });
    mockExecute.mockResolvedValue(undefined);
  });

  const createEvent = (
    pathParams: Record<string, string> | null,
    headers: Record<string, string> = {}
  ): APIGatewayProxyEvent =>
    ({
      body: null,
      headers: { Authorization: "Bearer token", ...headers },
      multiValueHeaders: {},
      httpMethod: "DELETE",
      isBase64Encoded: false,
      path: "/transcriptions/trans-1",
      pathParameters: pathParams,
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 204 on successful delete", async () => {
    const event = createEvent({ id: "trans-1" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(204);
    expect(result!.body).toBe("");
    expect(mockExecute).toHaveBeenCalledWith("trans-1", "user-123");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const event = createEvent({ id: "trans-1" }, { Authorization: "" });
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
    const { NotFoundError } = await import("../../../../src/shared/errors");
    mockExecute.mockRejectedValue(new NotFoundError("Transcription", "trans-1"));
    const event = createEvent({ id: "trans-1" });
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(404);
  });
});
