import { GetRealtimeTokenUseCase } from "../GetRealtimeTokenUseCase";
import { createMockRealtimeTokenProvider } from "../../../../../../tests/mocks";

describe("GetRealtimeTokenUseCase", () => {
  const mockTokenProvider = createMockRealtimeTokenProvider();
  let useCase: GetRealtimeTokenUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetRealtimeTokenUseCase(mockTokenProvider);
  });

  it("should return token, wsUrl and expiresIn from the provider", async () => {
    mockTokenProvider.getRealtimeToken.mockResolvedValue({
      token: "rt-token-xyz",
      wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      expiresIn: 3600,
    });

    const result = await useCase.execute("user-123");

    expect(mockTokenProvider.getRealtimeToken).toHaveBeenCalledWith("user-123");
    expect(result).toEqual({
      token: "rt-token-xyz",
      wsUrl: "wss://eu2.rt.speechmatics.com/v2/",
      expiresIn: 3600,
    });
  });

  it("should propagate errors from the token provider", async () => {
    mockTokenProvider.getRealtimeToken.mockRejectedValue(
      new Error("Token service unavailable")
    );

    await expect(useCase.execute("user-456")).rejects.toThrow(
      "Token service unavailable"
    );
  });
});
