import { defineStore } from 'pinia';
import type { Transcription } from '../types/transcription.types';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
const PAGE_SIZE = 10;

interface PageCacheEntry {
  items: Transcription[];
  totalPages: number;
  hasMore: boolean;
  fetchedAt: number;
}

export const useTranscriptionStore = defineStore('transcription', () => {
  // State
  const transcriptions = ref<Transcription[]>([]);
  const currentPage = ref(1);
  const totalPages = ref(1);
  const hasMore = ref(false);
  /** Items creados en sesión que deben aparecer arriba de la página 1 */
  const prependItems = ref<Transcription[]>([]);
  /** Cache por página para evitar re-fetch innecesario */
  const pageCache = ref<Record<number, PageCacheEntry>>({});

  // Computed
  const count = computed(() => transcriptions.value.length);

  /** Items a mostrar: en página 1 incluye prependItems al inicio, respetando el límite por página */
  const displayItems = computed(() => {
    if (currentPage.value !== 1) return transcriptions.value;
    const seen = new Set<string>();
    const merged: Transcription[] = [];
    for (const t of prependItems.value) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        merged.push(t);
        if (merged.length >= PAGE_SIZE) return merged;
      }
    }
    for (const t of transcriptions.value) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        merged.push(t);
        if (merged.length >= PAGE_SIZE) return merged;
      }
    }
    return merged;
  });

  // Actions
  const setTranscriptions = (data: {
    items: Transcription[];
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  }) => {
    const { items, currentPage: page } = data;
    // Al cargar página 1: mergear prependItems y limpiarlos (el servidor es fuente de verdad)
    if (page === 1 && prependItems.value.length > 0) {
      const seen = new Set<string>();
      const merged: Transcription[] = [];
      for (const t of prependItems.value) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          merged.push(t);
        }
      }
      for (const t of items) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          merged.push(t);
        }
      }
      transcriptions.value = merged;
      prependItems.value = [];
    } else {
      transcriptions.value = items;
    }
    currentPage.value = data.currentPage;
    totalPages.value = data.totalPages;
    hasMore.value = data.hasMore;
    pageCache.value[data.currentPage] = {
      items: transcriptions.value,
      totalPages: data.totalPages,
      hasMore: data.hasMore,
      fetchedAt: Date.now(),
    };
  };

  /** Añade una transcripción al inicio de la página 1 (sin llamar al endpoint) */
  const addTranscription = (transcription: Transcription) => {
    prependItems.value.unshift(transcription);
    // Si al agregar superamos el límite de la página 1, actualizar paginación
    const uniqueCount =
      new Set([
        ...prependItems.value.map((t) => t.id),
        ...transcriptions.value.map((t) => t.id),
      ]).size;
    if (uniqueCount > PAGE_SIZE) {
      totalPages.value = Math.ceil(uniqueCount / PAGE_SIZE);
      hasMore.value = true;
      // Invalidar caché para que el próximo fetch traiga datos actualizados del servidor
      pageCache.value = {};
    }
  };

  const removeTranscription = (id: string) => {
    transcriptions.value = transcriptions.value.filter((t) => t.id !== id);
    prependItems.value = prependItems.value.filter((t) => t.id !== id);
  };

  const updateTranscription = (id: string, updates: Partial<Transcription>) => {
    transcriptions.value = transcriptions.value.map((t) =>
      t.id === id ? { ...t, ...updates } : t,
    );
    prependItems.value = prependItems.value.map((t) =>
      t.id === id ? { ...t, ...updates } : t,
    );
  };

  const clear = () => {
    transcriptions.value = [];
    prependItems.value = [];
    pageCache.value = {};
    currentPage.value = 1;
    totalPages.value = 1;
    hasMore.value = false;
  };

  /** Invalida la caché de páginas para forzar recarga desde el servidor */
  const invalidatePageCache = () => {
    pageCache.value = {};
  };

  const getTranscriptionById = (id: string): Transcription | undefined => {
    return (
      transcriptions.value.find((t) => t.id === id) ??
      prependItems.value.find((t) => t.id === id)
    );
  };

  /** Devuelve datos cacheados si existen y tienen menos de 5 minutos */
  const getCachedPageData = (page: number): { items: Transcription[]; totalPages: number; hasMore: boolean } | null => {
    const entry = pageCache.value[page];
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return {
      items: entry.items,
      totalPages: entry.totalPages,
      hasMore: entry.hasMore,
    };
  };

  return {
    transcriptions,
    displayItems,
    currentPage,
    totalPages,
    hasMore,
    count,
    setTranscriptions,
    addTranscription,
    removeTranscription,
    updateTranscription,
    clear,
    invalidatePageCache,
    getCachedPageData,
    getTranscriptionById,
  };
});
