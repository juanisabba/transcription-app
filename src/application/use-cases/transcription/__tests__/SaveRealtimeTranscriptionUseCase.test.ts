import { SaveRealtimeTranscriptionUseCase } from "../SaveRealtimeTranscriptionUseCase";
import { createMockTranscriptionRepository } from "../../../../../tests/mocks";
import { Transcription } from "../../../../domain/entities/Transcription";
import { NotFoundError } from "../../../../shared/errors";

const makeTranscription = (id: string, userId: string): Transcription =>
  new Transcription(
    id,
    userId,
    "realtime-session",
    0,
    "pending",
    "",
    "",
    new Date(),
    new Date()
  );

describe("SaveRealtimeTranscriptionUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  let useCase: SaveRealtimeTranscriptionUseCase;

  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new SaveRealtimeTranscriptionUseCase(mockTranscriptionRepo);
  });

  it("should update transcription to completed with content", async () => {
    const transcription = makeTranscription("trans-1", userId);
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    await useCase.execute("trans-1", userId, "Hello world transcript");

    expect(mockTranscriptionRepo.findById).toHaveBeenCalledWith("trans-1", userId);
    expect(mockTranscriptionRepo.update).toHaveBeenCalledTimes(1);
    const updated = mockTranscriptionRepo.update.mock.calls[0][0];
    expect(updated.status).toBe("completed");
    expect(updated.content).toBe("Hello world transcript");
  });

  it("should throw NotFoundError when transcription does not exist", async () => {
    mockTranscriptionRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute("non-existent", userId, "content")
    ).rejects.toThrow(NotFoundError);

    expect(mockTranscriptionRepo.update).not.toHaveBeenCalled();
  });
});
