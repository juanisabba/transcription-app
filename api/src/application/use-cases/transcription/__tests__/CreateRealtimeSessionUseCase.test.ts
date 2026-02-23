import { CreateRealtimeSessionUseCase } from "../CreateRealtimeSessionUseCase";
import {
  createMockExternalApiService,
  createMockTranscriptionRepository,
} from "../../../../../../tests/mocks";

describe("CreateRealtimeSessionUseCase", () => {
  const mockExternalApi = createMockExternalApiService();
  const mockTranscriptionRepo = createMockTranscriptionRepository();
  let useCase: CreateRealtimeSessionUseCase;

  const userId = "user-123";

  beforeEach(() => {
    jest.clearAllMocks();
    mockTranscriptionRepo.save.mockResolvedValue(undefined);
    useCase = new CreateRealtimeSessionUseCase(mockExternalApi, mockTranscriptionRepo);
  });

  describe("happy path", () => {
    it("should return a realtime session token with wsUrl, ttl and transcriptionId", async () => {
      mockExternalApi.createRealtimeToken.mockResolvedValue({
        token: "rt-jwt-token-abc123",
        wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      });

      const result = await useCase.execute(userId);

      expect(result.token).toBe("rt-jwt-token-abc123");
      expect(result.wsUrl).toBe("wss://eu2.rt.speechmatics.com/v2/");
      expect(result.ttl).toBe(60);
      expect(result.transcriptionId).toBeDefined();
      expect(typeof result.transcriptionId).toBe("string");
    });

    it("should create a pending transcription before requesting token", async () => {
      mockExternalApi.createRealtimeToken.mockResolvedValue({
        token: "some-token",
        wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      });

      await useCase.execute(userId);

      expect(mockTranscriptionRepo.save).toHaveBeenCalledTimes(1);
      const savedTranscription = mockTranscriptionRepo.save.mock.calls[0][0];
      expect(savedTranscription.userId).toBe(userId);
      expect(savedTranscription.status).toBe("pending");
      expect(savedTranscription.fileName).toBe("realtime-session");
    });

    it("should request a token with a TTL of 60 seconds", async () => {
      mockExternalApi.createRealtimeToken.mockResolvedValue({
        token: "some-token",
        wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      });

      await useCase.execute(userId);

      expect(mockExternalApi.createRealtimeToken).toHaveBeenCalledWith(60);
    });
  });

  describe("error cases", () => {
    it("should propagate errors from the external API service", async () => {
      mockExternalApi.createRealtimeToken.mockRejectedValue(
        new Error("Speechmatics realtime token creation failed: 401")
      );

      await expect(useCase.execute(userId)).rejects.toThrow(
        "Speechmatics realtime token creation failed: 401"
      );
    });
  });
});
