import { StartTranscriptionUseCase } from "../StartTranscriptionUseCase";
import {
  createMockTranscriptionRepository,
  createMockJobMappingRepository,
  createMockExternalApiService,
  createMockStorageService,
} from "../../../../../../tests/mocks";
import { Transcription } from "../../../../domain/entities/Transcription";

describe("StartTranscriptionUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  const mockJobMappingRepo = createMockJobMappingRepository();
  const mockExternalApi = createMockExternalApiService();
  const mockStorageService = createMockStorageService();

  let useCase: StartTranscriptionUseCase;

  const userId = "user-123";
  const transcriptionId = "trans-456";
  const s3Key = `uploads/${userId}/${transcriptionId}/audio.mp3`;

  const pendingTranscription = new Transcription(
    transcriptionId,
    userId,
    "audio.mp3",
    1024,
    "pending",
    s3Key,
    "",
    new Date(),
    new Date()
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new StartTranscriptionUseCase(
      mockTranscriptionRepo,
      mockJobMappingRepo,
      mockExternalApi,
      mockStorageService
    );
    mockTranscriptionRepo.findById.mockResolvedValue(pendingTranscription);
    mockStorageService.generateDownloadPresignedUrl.mockResolvedValue(
      "https://s3.amazonaws.com/bucket/key?presigned=true"
    );
    mockExternalApi.submitJob.mockResolvedValue({ jobId: "speechmatics-job-999" });
    mockJobMappingRepo.save.mockResolvedValue(undefined);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);
  });

  describe("happy path", () => {
    it("should submit job to Speechmatics and save the job mapping", async () => {
      await useCase.execute(userId, transcriptionId, s3Key);

      expect(mockStorageService.generateDownloadPresignedUrl).toHaveBeenCalledWith(
        s3Key,
        3600
      );
      expect(mockExternalApi.submitJob).toHaveBeenCalledWith(
        "https://s3.amazonaws.com/bucket/key?presigned=true",
        "en"
      );
      expect(mockJobMappingRepo.save).toHaveBeenCalledWith(
        "speechmatics-job-999",
        transcriptionId,
        userId
      );
    });

    it("should update the transcription status to processing", async () => {
      await useCase.execute(userId, transcriptionId, s3Key);

      expect(mockTranscriptionRepo.update).toHaveBeenCalledTimes(1);
      const updatedTranscription =
        mockTranscriptionRepo.update.mock.calls[0][0];
      expect(updatedTranscription.status).toBe("processing");
    });

    it("should accept a custom language parameter", async () => {
      await useCase.execute(userId, transcriptionId, s3Key, "es");

      expect(mockExternalApi.submitJob).toHaveBeenCalledWith(
        expect.any(String),
        "es"
      );
    });

    it("should set duration when provided", async () => {
      await useCase.execute(userId, transcriptionId, s3Key, "en", 120);

      const updated = mockTranscriptionRepo.update.mock.calls[0][0];
      expect(updated.duration).toBe(120);
    });
  });

  describe("error cases", () => {
    it("should throw if the transcription is not found", async () => {
      mockTranscriptionRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(userId, "non-existent-id", s3Key)
      ).rejects.toThrow("no encontrada");
    });

    it("should propagate errors from the external API service", async () => {
      mockExternalApi.submitJob.mockRejectedValue(
        new Error("Speechmatics API error")
      );

      await expect(
        useCase.execute(userId, transcriptionId, s3Key)
      ).rejects.toThrow("Speechmatics API error");
    });
  });
});
