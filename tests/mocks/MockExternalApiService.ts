import type { IExternalApiService } from "../../src/application/ports/IExternalApiService";

export const createMockExternalApiService =
  (): jest.Mocked<IExternalApiService> => {
    return {
      submitJob: jest.fn(),
      getJobStatus: jest.fn(),
      getResult: jest.fn(),
      createRealtimeToken: jest.fn(),
    };
  };
