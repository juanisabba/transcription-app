import { defineStore } from 'pinia';
import type { Transcription } from '../types/transcription.types';

export const useTranscriptionStore = defineStore('transcription', () => {
  // State
  const transcriptions = ref<Transcription[]>([]);
  const currentPage = ref(1);
  const totalPages = ref(1);
  const hasMore = ref(false);

  // Computed
  const count = computed(() => transcriptions.value.length);

  // Actions
  const setTranscriptions = (data: {
    items: Transcription[];
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  }) => {
    transcriptions.value = data.items;
    currentPage.value = data.currentPage;
    totalPages.value = data.totalPages;
    hasMore.value = data.hasMore;
  };

  const addTranscription = (transcription: Transcription) => {
    transcriptions.value.unshift(transcription);
  };

  const removeTranscription = (id: string) => {
    transcriptions.value = transcriptions.value.filter((t) => t.id !== id);
  };

  const updateTranscription = (id: string, updates: Partial<Transcription>) => {
    const index = transcriptions.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      transcriptions.value[index] = {
        ...transcriptions.value[index],
        ...updates,
      };
    }
  };

  const clear = () => {
    transcriptions.value = [];
    currentPage.value = 1;
    totalPages.value = 1;
    hasMore.value = false;
  };

  return {
    transcriptions,
    currentPage,
    totalPages,
    hasMore,
    count,
    setTranscriptions,
    addTranscription,
    removeTranscription,
    updateTranscription,
    clear,
  };
});
