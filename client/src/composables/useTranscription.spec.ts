import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTranscription } from "./useTranscription";

const mockApi = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

vi.mock("./useApi", () => ({
  useApi: () => mockApi,
}));

vi.mock("../services/transcription.service", () => ({
  transcriptionService: {
    upload: vi.fn(),
    uploadWithConfirmation: vi.fn(),
    list: vi.fn(),
    getStats: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    saveRealtimeTranscription: vi.fn(),
  },
}));

import { transcriptionService } from "../services/transcription.service";

describe("useTranscription", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("upload actualiza store y muestra éxito", async () => {
    vi.mocked(transcriptionService.upload).mockResolvedValue({
      id: "t1",
      status: "pending",
      uploadUrl: "",
      expiresIn: 3600,
    });

    const { upload } = useTranscription();
    const transcriptionStore = useTranscriptionStore();
    const uiStore = useUiStore();

    await upload({ fileName: "audio.mp3", fileSize: 1024 });

    expect(transcriptionService.upload).toHaveBeenCalledWith(mockApi, {
      fileName: "audio.mp3",
      fileSize: 1024,
    });
    expect(transcriptionStore.displayItems).toHaveLength(1);
    expect(transcriptionStore.displayItems[0].fileName).toBe("audio.mp3");
    expect(uiStore.successMessage).toBe("Transcripción iniciada");
  });

  it("upload actualiza error en store cuando falla", async () => {
    vi.mocked(transcriptionService.upload).mockRejectedValue({
      response: { data: { message: "Archivo muy grande" } },
    });

    const { upload } = useTranscription();
    const uiStore = useUiStore();

    await expect(upload({ fileName: "big.mp3", fileSize: 999999 })).rejects.toThrow();
    expect(uiStore.error).toBe("Archivo muy grande");
  });

  it("list carga transcripciones en el store", async () => {
    vi.mocked(transcriptionService.list).mockResolvedValue({
      items: [
        {
          id: "t1",
          fileName: "a.mp3",
          status: "completed",
          type: "batch",
          createdAt: "2025-01-01",
        },
      ],
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
    });

    const { list } = useTranscription();
    const transcriptionStore = useTranscriptionStore();

    await list(1);

    expect(transcriptionService.list).toHaveBeenCalledWith(mockApi, { page: 1, pageSize: 10 });
    expect(transcriptionStore.transcriptions).toHaveLength(1);
    expect(transcriptionStore.transcriptions[0].id).toBe("t1");
  });

  it("remove elimina del store y muestra éxito", async () => {
    vi.mocked(transcriptionService.delete).mockResolvedValue(undefined);
    const { remove, list } = useTranscription();
    const transcriptionStore = useTranscriptionStore();
    const uiStore = useUiStore();

    transcriptionStore.setTranscriptions({
      items: [
        {
          id: "t1",
          fileName: "a.mp3",
          status: "completed",
          type: "batch",
          createdAt: "2025-01-01",
        },
      ],
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
    });

    await remove("t1");

    expect(transcriptionService.delete).toHaveBeenCalledWith(mockApi, "t1");
    expect(transcriptionStore.transcriptions).toHaveLength(0);
    expect(uiStore.successMessage).toBe("Transcripción eliminada");
  });

  it("getStats devuelve estadísticas", async () => {
    vi.mocked(transcriptionService.getStats).mockResolvedValue({
      totalBatchSeconds: 300,
      totalRealtimeSeconds: 120,
    });

    const { getStats } = useTranscription();

    const stats = await getStats();

    expect(stats).toEqual({ totalBatchSeconds: 300, totalRealtimeSeconds: 120 });
  });

  it("saveRealtime añade transcripción al store en éxito", async () => {
    vi.mocked(transcriptionService.saveRealtimeTranscription).mockResolvedValue(undefined);

    const { saveRealtime } = useTranscription();
    const transcriptionStore = useTranscriptionStore();
    const uiStore = useUiStore();
    const blob = new Blob(["audio"], { type: "audio/webm" });

    await saveRealtime("trans-1", "Texto transcrito", blob, "realtime.mp3", 90);

    expect(transcriptionService.saveRealtimeTranscription).toHaveBeenCalledWith(
      mockApi,
      "trans-1",
      "Texto transcrito",
      blob,
      "realtime.mp3",
      90
    );
    expect(transcriptionStore.displayItems).toHaveLength(1);
    expect(transcriptionStore.displayItems[0].status).toBe("completed");
    expect(transcriptionStore.displayItems[0].type).toBe("realtime");
    expect(uiStore.successMessage).toBe("Transcripción guardada");
  });
});
