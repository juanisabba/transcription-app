import type { IRealtimeTokenProvider } from "../../api/src/application/ports/IRealtimeTokenProvider";

export const createMockRealtimeTokenProvider =
  (): jest.Mocked<IRealtimeTokenProvider> => {
    return {
      getRealtimeToken: jest.fn(),
    };
  };
