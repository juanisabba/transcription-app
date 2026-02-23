import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTranscriptionStore } from "./transcription.store";
import type { Transcription } from "../types/transcription.types";

const mockTranscription = (
  overrides: Partial<Transcription> = {},
): Transcription => ({
  id: "t1",
  fileName: "audio.mp3",
  status: "completed",
  type: "batch",
  createdAt: "2025-01-01T00:00:00Z",
  ...overrides,
});

describe("transcription.store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("inicialmente tiene arrays vacíos", () => {
    const store = useTranscriptionStore();
    expect(store.transcriptions).toEqual([]);
    expect(store.displayItems).toEqual([]);
    expect(store.currentPage).toBe(1);
    expect(store.totalPages).toBe(1);
    expect(store.hasMore).toBe(false);
  });

  it("setTranscriptions actualiza items y paginación", () => {
    const store = useTranscriptionStore();
    const items = [
      mockTranscription({ id: "1" }),
      mockTranscription({ id: "2" }),
    ];

    store.setTranscriptions({
      items,
      currentPage: 1,
      totalPages: 2,
      hasMore: true,
    });

    expect(store.transcriptions).toEqual(items);
    expect(store.currentPage).toBe(1);
    expect(store.totalPages).toBe(2);
    expect(store.hasMore).toBe(true);
    expect(store.displayItems).toEqual(items);
  });

  it("addTranscription añade un item que aparece en displayItems cuando page es 1", () => {
    const store = useTranscriptionStore();
    store.setTranscriptions({
      items: [],
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
    });

    store.addTranscription(mockTranscription({ id: "new-1" }));

    expect(store.displayItems).toHaveLength(1);
    expect(store.displayItems[0]!.id).toBe("new-1");
  });

  it("removeTranscription elimina de transcriptions y prependItems", () => {
    const store = useTranscriptionStore();
    store.setTranscriptions({
      items: [mockTranscription({ id: "1" }), mockTranscription({ id: "2" })],
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
    });

    store.removeTranscription("1");

    expect(store.transcriptions).toHaveLength(1);
    expect(store.transcriptions[0]!.id).toBe("2");
  });

  it("updateTranscription actualiza un item existente", () => {
    const store = useTranscriptionStore();
    store.setTranscriptions({
      items: [mockTranscription({ id: "1", status: "pending" })],
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
    });

    store.updateTranscription("1", { status: "completed" });

    expect(store.transcriptions[0]!.status).toBe("completed");
  });

  it("clear resetea todo el estado", () => {
    const store = useTranscriptionStore();
    store.setTranscriptions({
      items: [mockTranscription({ id: "1" })],
      currentPage: 2,
      totalPages: 3,
      hasMore: true,
    });

    store.clear();

    expect(store.transcriptions).toEqual([]);
    expect(store.currentPage).toBe(1);
    expect(store.totalPages).toBe(1);
    expect(store.hasMore).toBe(false);
  });

  it("getTranscriptionById devuelve el item si existe", () => {
    const store = useTranscriptionStore();
    const t = mockTranscription({ id: "find-me" });
    store.setTranscriptions({
      items: [t],
      currentPage: 1,
      totalPages: 1,
      hasMore: false,
    });

    expect(store.getTranscriptionById("find-me")).toEqual(t);
    expect(store.getTranscriptionById("no-existe")).toBeUndefined();
  });
});
