import type { IStorageService } from "../../src/application/ports/IStorageService";

export const createMockStorageService = (): jest.Mocked<IStorageService> => {
  return {
    generatePresignedUrl: jest.fn(),
    generateDownloadPresignedUrl: jest.fn(),
    deleteFile: jest.fn(),
    getFile: jest.fn(),
  };
};
