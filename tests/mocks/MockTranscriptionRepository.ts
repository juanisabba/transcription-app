import type { ITranscriptionRepository } from "../../src/domain/repositories/ITranscriptionRepository";

export const createMockTranscriptionRepository =
  (): jest.Mocked<ITranscriptionRepository> => {
    return {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
    };
  };
