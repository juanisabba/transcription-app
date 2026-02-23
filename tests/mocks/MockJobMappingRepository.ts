import type { IJobMappingRepository } from "../../api/src/domain/repositories/IJobMappingRepository";

export const createMockJobMappingRepository =
  (): jest.Mocked<IJobMappingRepository> => {
    return {
      save: jest.fn(),
      findByJobId: jest.fn(),
    };
  };
