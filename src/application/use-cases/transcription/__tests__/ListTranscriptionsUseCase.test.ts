import { ListTranscriptionsUseCase } from "../ListTranscriptionsUseCase";
import { createMockTranscriptionRepository } from "../../../../../tests/mocks";
import { Transcription } from "../../../../domain/entities/Transcription";

const makeTranscription = (id: string, userId: string): Transcription =>
  new Transcription(
    id,
    userId,
    `file-${id}.mp3`,
    1024,
    "completed",
    `uploads/${userId}/${id}/file.mp3`,
    `Transcript for ${id}`,
    new Date(),
    new Date()
  );

describe("ListTranscriptionsUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  let useCase: ListTranscriptionsUseCase;

  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListTranscriptionsUseCase(mockTranscriptionRepo);
  });

  describe("happy path", () => {
    it("should return the first page of transcriptions", async () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        makeTranscription(`t-${i}`, userId)
      );
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items,
        hasMore: true,
        nextCursor: "cursor-abc",
      });

      const result = await useCase.execute(userId);

      expect(result.items).toHaveLength(10);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe("cursor-abc");
    });

    it("should return hasMore=false on the last page", async () => {
      const items = [makeTranscription("t-1", userId)];
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items,
        hasMore: false,
        nextCursor: undefined,
      });

      const result = await useCase.execute(userId, undefined);

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should pass cursor to repository for pagination", async () => {
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items: [],
        hasMore: false,
      });

      await useCase.execute(userId, "my-cursor");

      expect(mockTranscriptionRepo.findByUserId).toHaveBeenCalledWith(
        userId,
        10,
        "my-cursor"
      );
    });

    it("should cap page size at 10 even if a larger limit is passed", async () => {
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items: [],
        hasMore: false,
      });

      await useCase.execute(userId, undefined, 50);

      const calledLimit = mockTranscriptionRepo.findByUserId.mock.calls[0][1];
      expect(calledLimit).toBe(10);
    });

    it("should return empty items when user has no transcriptions", async () => {
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items: [],
        hasMore: false,
      });

      const result = await useCase.execute(userId);

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });
});
