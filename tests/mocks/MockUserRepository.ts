import type { IUserRepository } from "../../api/src/domain/repositories/IUserRepository";

export const createMockUserRepository = (): jest.Mocked<IUserRepository> => {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    save: jest.fn(),
    updateLastLogin: jest.fn(),
  };
};
