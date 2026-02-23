import type { ITranscriptionRepository } from "../../api/src/domain/repositories/ITranscriptionRepository";

export const createMockTranscriptionRepository =
  (): jest.Mocked<ITranscriptionRepository> => {
    return {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getStatsByUserId: jest.fn(),
      getAudioUrl: jest.fn(),
    };
  };
