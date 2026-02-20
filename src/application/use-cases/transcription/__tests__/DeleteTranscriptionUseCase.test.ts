import { createHmac } from "node:crypto";
import { DeleteTranscriptionUseCase } from "../DeleteTranscriptionUseCase";
import {
  createMockTranscriptionRepository,
  createMockStorageService,
} from "../../../../../tests/mocks";
import { Transcription } from "../../../../domain/entities/Transcription";
import { NotFoundError } from "../../../../shared/errors";

const makeTranscription = (
  id: string,
  userId: string,
  s3Path: string
): Transcription =>
  new Transcription(
    id,
    userId,
    "audio.mp3",
    1024,
    "completed",
    s3Path,
    "transcript content",
    new Date(),
    new Date()
  );

describe("DeleteTranscriptionUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  const mockStorageService = createMockStorageService();
  let useCase: DeleteTranscriptionUseCase;

  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteTranscriptionUseCase(
      mockTranscriptionRepo,
      mockStorageService
    );
  });

  it("should delete transcription and S3 file when found", async () => {
    const transcription = makeTranscription(
      "trans-1",
      userId,
      "uploads/user-123/trans-1/audio.mp3"
    );
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.delete.mockResolvedValue(undefined);
    mockStorageService.deleteFile.mockResolvedValue(undefined);

    await useCase.execute("trans-1", userId);

    expect(mockTranscriptionRepo.findById).toHaveBeenCalledWith("trans-1", userId);
    expect(mockStorageService.deleteFile).toHaveBeenCalledWith(
      "uploads/user-123/trans-1/audio.mp3"
    );
    expect(mockTranscriptionRepo.delete).toHaveBeenCalledWith("trans-1", userId);
  });

  it("should delete from DynamoDB only when S3 path is empty", async () => {
    const transcription = makeTranscription("trans-2", userId, "");
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.delete.mockResolvedValue(undefined);

    await useCase.execute("trans-2", userId);

    expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
    expect(mockTranscriptionRepo.delete).toHaveBeenCalledWith("trans-2", userId);
  });

  it("should throw NotFoundError when transcription does not exist", async () => {
    mockTranscriptionRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute("non-existent", userId)).rejects.toThrow(
      NotFoundError
    );

    expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
    expect(mockTranscriptionRepo.delete).not.toHaveBeenCalled();
  });

  it("should still delete from DynamoDB when S3 delete fails", async () => {
    const transcription = makeTranscription(
      "trans-3",
      userId,
      "uploads/user-123/trans-3/file.mp3"
    );
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockStorageService.deleteFile.mockRejectedValue(new Error("S3 error"));
    mockTranscriptionRepo.delete.mockResolvedValue(undefined);

    await useCase.execute("trans-3", userId);

    expect(mockTranscriptionRepo.delete).toHaveBeenCalledWith("trans-3", userId);
  });
});
