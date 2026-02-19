import { CreateRealtimeSessionUseCase } from "../CreateRealtimeSessionUseCase";
import { createMockExternalApiService } from "../../../../../tests/mocks";

describe("CreateRealtimeSessionUseCase", () => {
  const mockExternalApi = createMockExternalApiService();
  let useCase: CreateRealtimeSessionUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateRealtimeSessionUseCase(mockExternalApi);
  });

  describe("happy path", () => {
    it("should return a realtime session token with wsUrl and ttl", async () => {
      mockExternalApi.createRealtimeToken.mockResolvedValue({
        token: "rt-jwt-token-abc123",
        wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      });

      const result = await useCase.execute();

      expect(result.token).toBe("rt-jwt-token-abc123");
      expect(result.wsUrl).toBe("wss://eu2.rt.speechmatics.com/v2/");
      expect(result.ttl).toBe(60);
    });

    it("should request a token with a TTL of 60 seconds", async () => {
      mockExternalApi.createRealtimeToken.mockResolvedValue({
        token: "some-token",
        wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      });

      await useCase.execute();

      expect(mockExternalApi.createRealtimeToken).toHaveBeenCalledWith(60);
    });

    it("should call createRealtimeToken exactly once", async () => {
      mockExternalApi.createRealtimeToken.mockResolvedValue({
        token: "some-token",
        wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      });

      await useCase.execute();

      expect(mockExternalApi.createRealtimeToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("error cases", () => {
    it("should propagate errors from the external API service", async () => {
      mockExternalApi.createRealtimeToken.mockRejectedValue(
        new Error("Speechmatics realtime token creation failed: 401")
      );

      await expect(useCase.execute()).rejects.toThrow(
        "Speechmatics realtime token creation failed: 401"
      );
    });

    it("should propagate network errors", async () => {
      mockExternalApi.createRealtimeToken.mockRejectedValue(
        new Error("fetch failed")
      );

      await expect(useCase.execute()).rejects.toThrow("fetch failed");
    });
  });
});
