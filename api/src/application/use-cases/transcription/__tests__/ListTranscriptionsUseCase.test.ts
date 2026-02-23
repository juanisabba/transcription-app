import { ListTranscriptionsUseCase } from "../ListTranscriptionsUseCase";
import { createMockTranscriptionRepository } from "../../../../../../tests/mocks";
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

      const result = await useCase.execute(userId, 1, 10);

      expect(result.items).toHaveLength(10);
      expect(result.hasMore).toBe(true);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(1);
    });

    it("should return hasMore=false on the last page", async () => {
      const items = [makeTranscription("t-1", userId)];
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items,
        hasMore: false,
        nextCursor: undefined,
      });

      const result = await useCase.execute(userId, 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
    });

    it("should iterate through pages to reach page 2", async () => {
      const page1Items = Array.from({ length: 10 }, (_, i) =>
        makeTranscription(`t-${i}`, userId)
      );
      const page2Items = [makeTranscription("t-10", userId)];
      mockTranscriptionRepo.findByUserId
        .mockResolvedValueOnce({
          items: page1Items,
          hasMore: true,
          nextCursor: "cursor-page1",
        })
        .mockResolvedValueOnce({
          items: page2Items,
          hasMore: false,
          nextCursor: undefined,
        });

      const result = await useCase.execute(userId, 2, 10);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe("t-10");
      expect(result.hasMore).toBe(false);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(2);
      expect(mockTranscriptionRepo.findByUserId).toHaveBeenCalledTimes(2);
    });

    it("should cap page size at 10 even if a larger limit is passed", async () => {
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items: [],
        hasMore: false,
      });

      await useCase.execute(userId, 1, 50);

      const calledPageSize = mockTranscriptionRepo.findByUserId.mock.calls[0][1];
      expect(calledPageSize).toBe(10);
    });

    it("should return empty items when user has no transcriptions", async () => {
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items: [],
        hasMore: false,
      });

      const result = await useCase.execute(userId, 1, 10);

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(1);
    });

    it("should return empty when requesting page beyond available data", async () => {
      const page1Items = Array.from({ length: 5 }, (_, i) =>
        makeTranscription(`t-${i}`, userId)
      );
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items: page1Items,
        hasMore: false,
        nextCursor: undefined,
      });

      const result = await useCase.execute(userId, 3, 10);

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(3);
    });

    it("should clamp page and pageSize when less than 1", async () => {
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items: [makeTranscription("t-1", userId)],
        hasMore: false,
      });

      const result = await useCase.execute(userId, 0, 0);

      expect(mockTranscriptionRepo.findByUserId).toHaveBeenCalledWith(
        userId,
        1,
        undefined
      );
      expect(result.currentPage).toBe(1);
    });

    it("should return empty when hasMore is true but nextCursor is undefined (page 2)", async () => {
      mockTranscriptionRepo.findByUserId.mockResolvedValue({
        items: Array.from({ length: 10 }, (_, i) =>
          makeTranscription(`t-${i}`, userId)
        ),
        hasMore: true,
        nextCursor: undefined,
      });

      const result = await useCase.execute(userId, 2, 10);

      expect(result.items).toHaveLength(0);
      expect(result.totalPages).toBe(1);
      expect(result.currentPage).toBe(2);
    });
  });
});
