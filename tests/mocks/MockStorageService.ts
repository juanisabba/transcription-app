import type { IStorageService } from "../../api/src/application/ports/IStorageService";

export const createMockStorageService = (): jest.Mocked<IStorageService> => {
  return {
    uploadFile: jest.fn(),
    generatePresignedUrl: jest.fn(),
    generateDownloadPresignedUrl: jest.fn(),
    deleteFile: jest.fn(),
    getFile: jest.fn(),
  };
};
