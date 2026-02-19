import { DownloadTranscriptionUseCase } from "../DownloadTranscriptionUseCase";
import { createMockTranscriptionRepository } from "../../../../../tests/mocks";
import { Transcription } from "../../../../domain/entities/Transcription";
import { NotFoundError } from "../../../../shared/errors";

describe("DownloadTranscriptionUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  let useCase: DownloadTranscriptionUseCase;

  const userId = "user-123";
  const transcriptionId = "trans-456";

  const completedTranscription = new Transcription(
    transcriptionId,
    userId,
    "audio.mp3",
    1024,
    "completed",
    `uploads/${userId}/${transcriptionId}/audio.mp3`,
    "Hello world transcription text",
    new Date(),
    new Date()
  );

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DownloadTranscriptionUseCase(mockTranscriptionRepo);
  });

  describe("happy path", () => {
    it("should return transcript content for a completed transcription", async () => {
      mockTranscriptionRepo.findById.mockResolvedValue(completedTranscription);

      const result = await useCase.execute(userId, transcriptionId);

      expect(result.transcriptionId).toBe(transcriptionId);
      expect(result.fileName).toBe("audio.mp3");
      expect(result.content).toBe("Hello world transcription text");
      expect(result.status).toBe("completed");
    });
  });

  describe("error cases", () => {
    it("should throw NotFoundError if transcription does not exist", async () => {
      mockTranscriptionRepo.findById.mockResolvedValue(null);

      await expect(
        useCase.execute(userId, transcriptionId)
      ).rejects.toThrow(NotFoundError);
    });

    it("should throw if transcription is in pending status", async () => {
      const pendingTranscription = new Transcription(
        transcriptionId,
        userId,
        "audio.mp3",
        1024,
        "pending",
        `uploads/${userId}/${transcriptionId}/audio.mp3`,
        "",
        new Date(),
        new Date()
      );
      mockTranscriptionRepo.findById.mockResolvedValue(pendingTranscription);

      await expect(
        useCase.execute(userId, transcriptionId)
      ).rejects.toThrow("not ready for download");
    });

    it("should throw if transcription is still processing", async () => {
      const processingTranscription = new Transcription(
        transcriptionId,
        userId,
        "audio.mp3",
        1024,
        "processing",
        `uploads/${userId}/${transcriptionId}/audio.mp3`,
        "",
        new Date(),
        new Date()
      );
      mockTranscriptionRepo.findById.mockResolvedValue(processingTranscription);

      await expect(
        useCase.execute(userId, transcriptionId)
      ).rejects.toThrow("not ready for download");
    });
  });
});
