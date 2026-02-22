import { SaveRealtimeTranscriptionUseCase } from "../SaveRealtimeTranscriptionUseCase";
import {
  createMockTranscriptionRepository,
  createMockStorageService,
} from "../../../../../tests/mocks";
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

const mockAudioBuffer = Buffer.from("fake-audio-content");

describe("SaveRealtimeTranscriptionUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  const mockStorageService = createMockStorageService();
  let useCase: SaveRealtimeTranscriptionUseCase;

  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageService.uploadFile.mockResolvedValue(undefined);
    useCase = new SaveRealtimeTranscriptionUseCase(
      mockTranscriptionRepo,
      mockStorageService
    );
  });

  it("should upload to S3 and update transcription to completed", async () => {
    const transcription = makeTranscription("trans-1", userId);
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    const result = await useCase.execute(
      "trans-1",
      userId,
      "Hello world transcript",
      mockAudioBuffer,
      "audio/webm"
    );

    expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(1);
    expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
      expect.stringContaining("uploads/user-123/trans-1/realtime_audio."),
      mockAudioBuffer,
      "audio/webm"
    );
    expect(mockTranscriptionRepo.findById).toHaveBeenCalledWith(
      "trans-1",
      userId
    );
    expect(mockTranscriptionRepo.update).toHaveBeenCalledTimes(1);
    const updated = mockTranscriptionRepo.update.mock.calls[0][0];
    expect(updated.status).toBe("completed");
    expect(updated.content).toBe("Hello world transcript");
    expect(result).toEqual({ transcriptionId: "trans-1" });
  });

  it("should throw NotFoundError when transcription does not exist", async () => {
    mockTranscriptionRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(
        "non-existent",
        userId,
        "content",
        mockAudioBuffer
      )
    ).rejects.toThrow(NotFoundError);

    expect(mockStorageService.uploadFile).not.toHaveBeenCalled();
    expect(mockTranscriptionRepo.update).not.toHaveBeenCalled();
  });

  it("should throw ValidationError when userId is empty", async () => {
    await expect(
      useCase.execute("trans-1", "", "content", mockAudioBuffer)
    ).rejects.toThrow("userId no puede ser null o vacío");
  });

  it("should throw ValidationError when transcriptionId is empty", async () => {
    await expect(
      useCase.execute("", userId, "content", mockAudioBuffer)
    ).rejects.toThrow("transcriptionId no puede ser null o vacío");
  });

  it("should throw ValidationError when content is empty", async () => {
    await expect(
      useCase.execute(userId, "trans-1", "", mockAudioBuffer)
    ).rejects.toThrow("content no puede estar vacío");
  });

  it("should throw ValidationError when audioBuffer is not a Buffer", async () => {
    await expect(
      useCase.execute(userId, "trans-1", "content", null as unknown as Buffer)
    ).rejects.toThrow("audioFile no puede ser null/undefined");
  });

  it("should throw ValidationError when audioBuffer is empty", async () => {
    await expect(
      useCase.execute(userId, "trans-1", "content", Buffer.from([]))
    ).rejects.toThrow("audioFile no puede estar vacío");
  });

  it("should use correct extension for wav content type", async () => {
    const transcription = makeTranscription("trans-1", userId);
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    await useCase.execute(
      "trans-1",
      userId,
      "Transcript",
      mockAudioBuffer,
      "audio/wav"
    );

    expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
      expect.stringContaining("realtime_audio.wav"),
      mockAudioBuffer,
      "audio/wav"
    );
  });

  it("should use correct extension for ogg/opus content type", async () => {
    const transcription = makeTranscription("trans-1", userId);
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    await useCase.execute(
      "trans-1",
      userId,
      "Transcript",
      mockAudioBuffer,
      "audio/ogg"
    );

    expect(mockStorageService.uploadFile).toHaveBeenCalledWith(
      expect.stringContaining("realtime_audio.ogg"),
      mockAudioBuffer,
      "audio/ogg"
    );
  });

  it("should set duration when provided", async () => {
    const transcription = makeTranscription("trans-1", userId);
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    await useCase.execute(
      "trans-1",
      userId,
      "Transcript",
      mockAudioBuffer,
      "audio/webm",
      undefined,
      30
    );

    const updated = mockTranscriptionRepo.update.mock.calls[0][0];
    expect(updated.duration).toBe(30);
  });

  it("should use customFileName when provided", async () => {
    const transcription = makeTranscription("trans-1", userId);
    mockTranscriptionRepo.findById.mockResolvedValue(transcription);
    mockTranscriptionRepo.update.mockResolvedValue(undefined);

    await useCase.execute(
      "trans-1",
      userId,
      "Transcript",
      mockAudioBuffer,
      "audio/webm",
      "Mi grabación"
    );

    const updated = mockTranscriptionRepo.update.mock.calls[0][0];
    expect(updated.fileName).toBe("Mi grabación");
  });
});
