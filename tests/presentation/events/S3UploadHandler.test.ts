import type { Context, S3Event, S3Handler } from "aws-lambda";

const mockExecute = jest.fn();

jest.mock("../../../api/src/infrastructure/repositories/transcriptionRepositoryInstance", () => ({
  transcriptionRepository: { save: jest.fn(), findById: jest.fn(), findByUserId: jest.fn(), update: jest.fn() },
}));

jest.mock("../../../api/src/infrastructure/repositories/jobMappingRepositoryInstance", () => ({
  jobMappingRepository: { save: jest.fn(), findByJobId: jest.fn() },
}));

jest.mock("../../../api/src/infrastructure/adapters/external-services/speechMaticsAdapterInstance", () => ({
  speechMaticsAdapter: { submitJob: jest.fn(), getJobStatus: jest.fn(), getResult: jest.fn(), createRealtimeToken: jest.fn() },
}));

jest.mock("../../../api/src/infrastructure/adapters/storage/storageServiceInstance", () => ({
  storageService: { generatePresignedUrl: jest.fn(), getFile: jest.fn(), deleteFile: jest.fn() },
}));

jest.mock("../../../src/application/use-cases/transcription/StartTranscriptionUseCase", () => ({
  StartTranscriptionUseCase: jest.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

import { handler } from "../../../src/presentation/events/S3UploadHandler";

describe("S3UploadHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecute.mockResolvedValue(undefined);
  });

  const createS3Event = (key: string): S3Event => ({
    Records: [
      {
        eventVersion: "2.1",
        eventSource: "aws:s3",
        awsRegion: "eu-west-1",
        eventTime: "2024-01-01T00:00:00.000Z",
        eventName: "ObjectCreated:Put",
        s3: {
          s3SchemaVersion: "1.0",
          configurationId: "test",
          bucket: { name: "vocali-transcriptions-dev", arn: "arn:aws:s3:::bucket" },
          object: {
            key,
            size: 1024,
            eTag: "etag",
            sequencer: "seq",
            versionId: "v1",
          },
        },
      } as S3Event["Records"][0],
    ],
  });

  it("calls StartTranscriptionUseCase when key has valid format", async () => {
    const event = createS3Event("uploads/user-123/trans-456/audio.mp3");
    await (handler as S3Handler)(event, {} as Context, () => {});

    expect(mockExecute).toHaveBeenCalledWith("user-123", "trans-456", "uploads/user-123/trans-456/audio.mp3");
  });

  it("does not throw when key has invalid format", async () => {
    const event = createS3Event("invalid/key/format");
    await expect((handler as S3Handler)(event, {} as Context, () => {})).resolves.not.toThrow();
  });
});
