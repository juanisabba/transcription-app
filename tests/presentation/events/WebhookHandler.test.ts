import { createHmac } from "node:crypto";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";

const mockFindByJobId = jest.fn();
const mockExecute = jest.fn();

jest.mock("../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance", () => ({
  transcriptionRepository: { save: jest.fn(), findById: jest.fn(), findByUserId: jest.fn(), update: jest.fn() },
}));

jest.mock("../../../api/src/infrastructure/repositories/jobMappingRepositoryInstance", () => ({
  jobMappingRepository: {
    save: jest.fn(),
    findByJobId: mockFindByJobId,
  },
}));

jest.mock("../../../api/src/infrastructure/adapters/external-services/speechMaticsAdapterInstance", () => ({
  speechMaticsAdapter: { submitJob: jest.fn(), getJobStatus: jest.fn(), getResult: jest.fn(), createRealtimeToken: jest.fn() },
}));

jest.mock("../../../api/src/application/use-cases/transcription/ProcessTranscriptionResultUseCase", () => ({
  ProcessTranscriptionResultUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

import { handler } from "../../../api/src/presentation/events/WebhookHandler";

describe("WebhookHandler", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockResolvedValue(undefined);
    process.env = { ...originalEnv };
    delete process.env.SPEECHMATICS_WEBHOOK_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createEvent = (
    queryParams: Record<string, string> = {},
    body: string | null = null
  ): APIGatewayProxyEvent =>
    ({
      body,
      headers: {},
      multiValueHeaders: {},
      httpMethod: "POST",
      isBase64Encoded: false,
      path: "/webhook/speechmatics",
      pathParameters: null,
      queryStringParameters: queryParams,
      multiValueQueryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent["requestContext"],
      resource: "",
    }) as APIGatewayProxyEvent;

  it("returns 400 when job id is missing", async () => {
    const event = createEvent({}, JSON.stringify({ results: [] }));
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
  });

  it("returns 400 when body has invalid JSON", async () => {
    const event = createEvent({}, "not valid json");
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(400);
  });

  it("returns 200 when job mapping not found (confirm receipt)", async () => {
    mockFindByJobId.mockResolvedValue(null);

    const event = createEvent(
      {},
      JSON.stringify({ job: { id: "job-123" }, results: [] })
    );
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("returns 401 when SPEECHMATICS_WEBHOOK_SECRET is set and signature is missing", async () => {
    process.env.SPEECHMATICS_WEBHOOK_SECRET = "my-secret";
    const event = createEvent(
      {},
      JSON.stringify({ job: { id: "job-123" }, results: [] })
    );
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("returns 401 when signature is invalid", async () => {
    process.env.SPEECHMATICS_WEBHOOK_SECRET = "my-secret";
    const body = JSON.stringify({ job: { id: "job-123" }, results: [] });
    const event = createEvent({}, body);
    (event.headers as Record<string, string>)["X-Webhook-Signature"] = "invalid-signature";
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(401);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("returns 200 when signature is valid", async () => {
    process.env.SPEECHMATICS_WEBHOOK_SECRET = "my-secret";
    mockFindByJobId.mockResolvedValue(null);
    const body = JSON.stringify({ job: { id: "job-123" }, results: [] });
    const signature = createHmac("sha256", "my-secret")
      .update(body, "utf8")
      .digest("hex");
    const event = createEvent({}, body);
    (event.headers as Record<string, string>)["X-Webhook-Signature"] = signature;
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
  });

  it("returns 200 when job mapping exists, processes async", async () => {
    mockFindByJobId.mockResolvedValue({
      jobId: "job-123",
      transcriptionId: "trans-456",
      userId: "user-789",
    });

    const event = createEvent(
      {},
      JSON.stringify({
        job: { id: "job-123" },
        results: [
          { type: "word", alternatives: [{ content: "hello" }] },
          { type: "word", alternatives: [{ content: "world" }] },
        ],
      })
    );
    const ctx: Context = { callbackWaitsForEmptyEventLoop: true } as Context;
    const result = await handler(event, ctx, () => {});

    expect(result).toBeDefined();
    expect(result!.statusCode).toBe(200);
    expect(mockExecute).toHaveBeenCalledWith(
      "job-123",
      "trans-456",
      "user-789",
      "hello world"
    );
  });
});
