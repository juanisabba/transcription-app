import type { IRealtimeTokenProvider } from "../../src/application/ports/IRealtimeTokenProvider";

export const createMockRealtimeTokenProvider =
  (): jest.Mocked<IRealtimeTokenProvider> => {
    return {
      getRealtimeToken: jest.fn(),
    };
  };
