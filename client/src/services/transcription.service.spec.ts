import type { AxiosInstance } from "axios";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { transcriptionService } from "./transcription.service";

type MockedApi = {
  post: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const createMockApi = (): MockedApi => ({
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
});

describe("transcription.service", () => {
  let mockApi: ReturnType<typeof createMockApi>;

  beforeEach(() => {
    mockApi = createMockApi();
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
    } as Response);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock-url"),
      revokeObjectURL: vi.fn(),
    });
    const mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    };
    vi.stubGlobal("document", {
      createElement: vi.fn(() => mockLink),
    });
  });

  describe("upload", () => {
    it("llama POST /transcriptions/upload con el request", async () => {
      mockApi.post.mockResolvedValue({
        data: {
          id: "t1",
          status: "pending",
          uploadUrl: "https://s3.example.com",
          expiresIn: 3600,
        },
      });

      const result = await transcriptionService.upload(
        mockApi as unknown as AxiosInstance,
        {
          fileName: "audio.mp3",
          fileSize: 1024,
        },
      );

      expect(mockApi.post).toHaveBeenCalledWith("/transcriptions/upload", {
        fileName: "audio.mp3",
        fileSize: 1024,
      });
      expect(result).toEqual({
        id: "t1",
        status: "pending",
        uploadUrl: "https://s3.example.com",
        expiresIn: 3600,
      });
    });
  });

  describe("list", () => {
    it("llama GET /transcriptions con params", async () => {
      mockApi.get.mockResolvedValue({
        data: {
          items: [],
          currentPage: 1,
          totalPages: 1,
          hasMore: false,
        },
      });

      await transcriptionService.list(mockApi as unknown as AxiosInstance, {
        page: 2,
        pageSize: 20,
      });

      expect(mockApi.get).toHaveBeenCalledWith("/transcriptions", {
        params: { page: 2, pageSize: 20 },
      });
    });
  });

  describe("getStats", () => {
    it("llama GET /transcriptions/stats", async () => {
      mockApi.get.mockResolvedValue({
        data: { totalBatchSeconds: 100, totalRealtimeSeconds: 50 },
      });

      const result = await transcriptionService.getStats(
        mockApi as unknown as AxiosInstance,
      );

      expect(mockApi.get).toHaveBeenCalledWith("/transcriptions/stats");
      expect(result).toEqual({
        totalBatchSeconds: 100,
        totalRealtimeSeconds: 50,
      });
    });
  });

  describe("delete", () => {
    it("llama DELETE /transcriptions/:id", async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await transcriptionService.delete(mockApi as unknown as AxiosInstance, "trans-1");

      expect(mockApi.delete).toHaveBeenCalledWith("/transcriptions/trans-1");
    });
  });

  describe("getRealtimeSession", () => {
    it("llama POST /transcriptions/realtime", async () => {
      mockApi.post.mockResolvedValue({
        data: {
          transcriptionId: "rt-1",
          token: "jwt",
          wsUrl: "wss://example.com",
        },
      });

      const result = await transcriptionService.getRealtimeSession(
        mockApi as unknown as AxiosInstance,
      );

      expect(mockApi.post).toHaveBeenCalledWith("/transcriptions/realtime");
      expect(result.transcriptionId).toBe("rt-1");
      expect(result.token).toBe("jwt");
    });
  });

  describe("saveRealtimeTranscription", () => {
    it("llama POST con content, fileName y audioBase64", async () => {
      mockApi.post.mockResolvedValue({ data: {} });
      vi.stubGlobal(
        "FileReader",
        class MockFileReader {
          result = "";
          onloadend: (() => void) | null = null;
          readAsDataURL() {
            queueMicrotask(() => {
              this.result = "data:audio/webm;base64,YXVkaW8=";
              this.onloadend?.();
            });
          }
        },
      );

      const blob = new Blob(["audio"], { type: "audio/webm" });
      await transcriptionService.saveRealtimeTranscription(
        mockApi as unknown as AxiosInstance,
        "trans-1",
        "Texto transcrito",
        blob,
        "realtime.mp3",
        90,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/transcriptions/realtime/trans-1/save",
        expect.objectContaining({
          content: "Texto transcrito",
          fileName: "realtime.mp3",
          duration: 90,
        }),
      );
      expect(mockApi.post.mock.calls[0]![1]).toHaveProperty("audioBase64");
    });
  });

  describe("uploadWithConfirmation", () => {
    it("sube a presigned URL y confirma", async () => {
      mockApi.post
        .mockResolvedValueOnce({
          data: {
            id: "t1",
            status: "pending",
            uploadUrl: "https://s3.example.com/upload",
            expiresIn: 3600,
          },
        })
        .mockResolvedValueOnce({ data: {} });

      const file = new File(["content"], "audio.mp3", { type: "audio/mpeg" });
      const result = await transcriptionService.uploadWithConfirmation(
        mockApi as unknown as AxiosInstance,
        file,
        undefined,
        120,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/transcriptions/upload",
        expect.any(Object),
      );
      expect(fetch).toHaveBeenCalledWith(
        "https://s3.example.com/upload",
        expect.objectContaining({
          method: "PUT",
          body: file,
        }),
      );
      expect(mockApi.post).toHaveBeenCalledWith("/transcriptions/t1/confirm", {
        duration: 120,
      });
      expect(result.id).toBe("t1");
    });

    it("lanza error si fetch falla", async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);
      mockApi.post.mockResolvedValueOnce({
        data: {
          id: "t1",
          uploadUrl: "https://s3.example.com",
          status: "pending",
          expiresIn: 3600,
        },
      });

      const file = new File(["x"], "a.mp3", { type: "audio/mpeg" });
      await expect(
        transcriptionService.uploadWithConfirmation(
          mockApi as unknown as AxiosInstance,
          file,
        ),
      ).rejects.toThrow("Error al subir el archivo a S3");
    });
  });

  describe("download", () => {
    it("crea link de descarga y hace click", async () => {
      mockApi.get.mockResolvedValue({
        data: new Blob(["contenido"], { type: "text/plain" }),
      });

      await transcriptionService.download(
        mockApi as unknown as AxiosInstance,
        "trans-1",
        "audio.mp3",
      );

      expect(mockApi.get).toHaveBeenCalledWith(
        "/transcriptions/trans-1/download",
        {
          responseType: "blob",
        },
      );
    });
  });
});
