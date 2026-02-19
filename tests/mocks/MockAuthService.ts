import type { IAuthService } from "../../src/application/ports/IAuthService";

export const createMockAuthService = (): jest.Mocked<IAuthService> => {
  return {
    register: jest.fn(),
    authenticateWithPassword: jest.fn(),
    validateToken: jest.fn(),
    refreshAccessToken: jest.fn(),
  };
};
