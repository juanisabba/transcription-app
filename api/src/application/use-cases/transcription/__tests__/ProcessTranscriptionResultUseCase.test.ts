import { ProcessTranscriptionResultUseCase } from "../ProcessTranscriptionResultUseCase";
import {
  createMockTranscriptionRepository,
  createMockExternalApiService,
} from "../../../../../../tests/mocks";
import { Transcription } from "../../../../domain/entities/Transcription";

const makeTranscription = (id: string, userId: string): Transcription =>
  new Transcription(
    id,
    userId,
    "file.mp3",
    1024,
    "processing",
    "uploads/user/file.mp3",
    "",
    new Date(),
    new Date()
  );

describe("ProcessTranscriptionResultUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  const mockExternalApi = createMockExternalApiService();
  let useCase: ProcessTranscriptionResultUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ProcessTranscriptionResultUseCase(
      mockTranscriptionRepo,
      mockExternalApi
    );
  });

  it("should update transcription with transcript when provided", async () => {
    const transcription = makeTranscription("trans-1", "user-123");
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    await useCase.execute("job-1", "trans-1", "user-123", "Hello world");

    expect(mockExternalApi.getResult).not.toHaveBeenCalled();
    expect(mockTranscriptionRepo.findById).toHaveBeenCalledWith(
      "trans-1",
      "user-123"
    );
    expect(mockTranscriptionRepo.update).toHaveBeenCalledTimes(1);
    const updated = mockTranscriptionRepo.update.mock.calls[0][0];
    expect(updated.status).toBe("completed");
    expect(updated.content).toBe("Hello world");
  });

  it("should fetch transcript from external API when not provided", async () => {
    mockExternalApi.getResult.mockResolvedValue({
      transcript: "Fetched transcript text",
    });
    const transcription = makeTranscription("trans-1", "user-123");
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    await useCase.execute("job-1", "trans-1", "user-123");

    expect(mockExternalApi.getResult).toHaveBeenCalledWith("job-1");
    const updated = mockTranscriptionRepo.update.mock.calls[0][0];
    expect(updated.content).toBe("Fetched transcript text");
  });

  it("should fetch transcript when empty string is provided", async () => {
    mockExternalApi.getResult.mockResolvedValue({
      transcript: "API transcript",
    });
    const transcription = makeTranscription("trans-1", "user-123");
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    await useCase.execute("job-1", "trans-1", "user-123", "");

    expect(mockExternalApi.getResult).toHaveBeenCalledWith("job-1");
    const updated = mockTranscriptionRepo.update.mock.calls[0][0];
    expect(updated.content).toBe("API transcript");
  });

  it("should throw when transcription not found", async () => {
    mockExternalApi.getResult.mockResolvedValue({ transcript: "text" });
    mockTranscriptionRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute("job-1", "trans-1", "user-123")
    ).rejects.toThrow("Transcripción trans-1 no encontrada");
  });
});
