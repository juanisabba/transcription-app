import { GetStatsUseCase } from "../GetStatsUseCase";
import { createMockTranscriptionRepository } from "../../../../../tests/mocks";

describe("GetStatsUseCase", () => {
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  let useCase: GetStatsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetStatsUseCase(mockTranscriptionRepo);
  });

  it("should return totalBatchSeconds and totalRealtimeSeconds for user", async () => {
    mockTranscriptionRepo.getStatsByUserId.mockResolvedValue({
      totalBatchSeconds: 120,
      totalRealtimeSeconds: 45,
    });

    const result = await useCase.execute("user-123");

    expect(mockTranscriptionRepo.getStatsByUserId).toHaveBeenCalledWith(
      "user-123"
    );
    expect(result).toEqual({
      totalBatchSeconds: 120,
      totalRealtimeSeconds: 45,
    });
  });

  it("should return zeros when user has no transcriptions", async () => {
    mockTranscriptionRepo.getStatsByUserId.mockResolvedValue({
      totalBatchSeconds: 0,
      totalRealtimeSeconds: 0,
    });

    const result = await useCase.execute("user-new");

    expect(result.totalBatchSeconds).toBe(0);
    expect(result.totalRealtimeSeconds).toBe(0);
  });
});
