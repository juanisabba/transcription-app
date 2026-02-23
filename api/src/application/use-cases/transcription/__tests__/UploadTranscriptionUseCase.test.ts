import { UploadTranscriptionUseCase } from "../UploadTranscriptionUseCase";
import {
  createMockTranscriptionRepository,
  createMockStorageService,
} from "../../../../../../tests/mocks";
import type { UploadTranscriptionDTO } from "../../../dto/transcription";

describe("UploadTranscriptionUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  const mockStorageService = createMockStorageService();

  let useCase: UploadTranscriptionUseCase;

  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UploadTranscriptionUseCase(
      mockTranscriptionRepo,
      mockStorageService
    );
    mockTranscriptionRepo.save.mockResolvedValue(undefined);
    mockStorageService.generatePresignedUrl.mockResolvedValue(
      "https://s3.amazonaws.com/bucket/key?X-Amz-Signature=abc"
    );
  });

  describe("happy path", () => {
    it("should return a presigned URL with transcriptionId", async () => {
      const request: UploadTranscriptionDTO = {
        fileName: "audio.mp3",
        fileSize: 1024 * 1024, // 1 MB
      };

      const result = await useCase.execute(userId, request);

      expect(result).toHaveProperty("uploadUrl");
      expect(result.uploadUrl).toBe(
        "https://s3.amazonaws.com/bucket/key?X-Amz-Signature=abc"
      );
      expect(result).toHaveProperty("transcriptionId");
      expect(typeof result.transcriptionId).toBe("string");
      expect(result.expiresIn).toBe(3600);
    });

    it("should persist the transcription as pending before generating URL", async () => {
      const request: UploadTranscriptionDTO = {
        fileName: "recording.wav",
        fileSize: 500000,
      };

      await useCase.execute(userId, request);

      expect(mockTranscriptionRepo.save).toHaveBeenCalledTimes(1);
      const savedTranscription = mockTranscriptionRepo.save.mock.calls[0][0];
      expect(savedTranscription.status).toBe("pending");
      expect(savedTranscription.userId).toBe(userId);
      expect(savedTranscription.fileName).toBe("recording.wav");
      expect(savedTranscription.fileSize).toBe(500000);
    });

    it("should generate a presigned URL with the correct S3 path", async () => {
      const request: UploadTranscriptionDTO = {
        fileName: "test.mp3",
        fileSize: 2000000,
      };

      await useCase.execute(userId, request);

      const calledKey = mockStorageService.generatePresignedUrl.mock.calls[0][0];
      expect(calledKey).toMatch(new RegExp(`^uploads/${userId}/`));
      expect(calledKey).toContain("test.mp3");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError if fileName is missing", async () => {
      const request: UploadTranscriptionDTO = {
        fileName: "",
        fileSize: 1024,
      };
      await expect(useCase.execute(userId, request)).rejects.toThrow(
        "fileName es requerido"
      );
      expect(mockTranscriptionRepo.save).not.toHaveBeenCalled();
    });

    it("should throw ValidationError if fileSize is not a number", async () => {
      const request = {
        fileName: "audio.mp3",
        fileSize: "not-a-number" as unknown as number,
      };
      await expect(useCase.execute(userId, request)).rejects.toThrow(
        "fileSize must be a number"
      );
    });

    it("should throw ValidationError if fileSize exceeds 20 MB", async () => {
      const request: UploadTranscriptionDTO = {
        fileName: "huge.mp3",
        fileSize: 21 * 1024 * 1024, // 21 MB
      };
      await expect(useCase.execute(userId, request)).rejects.toThrow(
        /fileSize excede el límite de 20 MB/
      );
      expect(mockTranscriptionRepo.save).not.toHaveBeenCalled();
    });

    it("should throw InvalidFileTypeException if contentType is not audio/*", async () => {
      const request: UploadTranscriptionDTO = {
        fileName: "video.mp4",
        fileSize: 1024,
        contentType: "video/mp4",
      };
      await expect(useCase.execute(userId, request)).rejects.toThrow(
        /Tipo de archivo no válido/
      );
      expect(mockTranscriptionRepo.save).not.toHaveBeenCalled();
    });

    it("should accept valid audio/* content types", async () => {
      const request: UploadTranscriptionDTO = {
        fileName: "audio.ogg",
        fileSize: 1024,
        contentType: "audio/ogg",
      };
      const result = await useCase.execute(userId, request);
      expect(result.transcriptionId).toBeDefined();
      expect(mockTranscriptionRepo.save).toHaveBeenCalled();
    });

    it("should throw InvalidFileTypeException when contentType is not a string", async () => {
      const request = {
        fileName: "audio.mp3",
        fileSize: 1024,
        contentType: 123 as unknown as string,
      };
      await expect(useCase.execute(userId, request)).rejects.toThrow(
        /Tipo de archivo no válido/
      );
    });
  });
});
