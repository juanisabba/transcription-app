<template>
  <div class="grid grid-cols-2 gap-4 mb-6">
    <!-- Tiempo en Archivos -->
    <div
      class="bg-white rounded-lg shadow p-4 flex items-center gap-3 border border-gray-100"
    >
      <div
        class="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-indigo-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div>
        <p class="text-sm font-medium text-gray-500">
          Tiempo en Archivos Pregrabados
        </p>
        <p class="text-lg font-semibold text-gray-900">
          {{ stats ? formatDuration(stats.totalBatchSeconds) : "—" }}
        </p>
      </div>
    </div>

    <!-- Tiempo en Vivo -->
    <div
      class="bg-white rounded-lg shadow p-4 flex items-center gap-3 border border-gray-100"
    >
      <div
        class="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </div>
      <div>
        <p class="text-sm font-medium text-gray-500">Tiempo en Vivo</p>
        <p class="text-lg font-semibold text-gray-900">
          {{ stats ? formatDuration(stats.totalRealtimeSeconds) : "—" }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TranscriptionStatsResponse } from "@/types/transcription.types";
import { formatDuration } from "@/utils/format";

const { getStats } = useTranscription();
const stats = ref<TranscriptionStatsResponse | null>(null);

onMounted(async () => {
  try {
    stats.value = await getStats();
  } catch {
    stats.value = { totalBatchSeconds: 0, totalRealtimeSeconds: 0 };
  }
});
</script>
