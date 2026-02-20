<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Historial de Transcripciones
        </h1>
        <p class="text-gray-600">Todas tus transcripciones guardadas</p>
      </div>

      <!-- Error Alert -->
      <div
        v-if="uiStore.error"
        class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
      >
        {{ uiStore.error }}
      </div>

      <!-- Loading -->
      <div v-if="uiStore.isLoading" class="text-center py-8">
        <p class="text-gray-600">Cargando...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="transcriptionStore.transcriptions.length === 0"
        class="bg-white rounded-lg shadow-lg p-8 text-center"
      >
        <svg
          class="w-16 h-16 mx-auto mb-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2m0-14c0-1.104 1.343-2 3-2s3 .896 3 2m0 14c0 1.105 1.343 2 3 2s3-.895 3-2m0-14c0-1.104-1.343-2-3-2s-3 .896-3 2"
          />
        </svg>
        <p class="text-gray-600 mb-4">No tienes transcripciones aún</p>
        <NuxtLink
          to="/transcribe/upload"
          class="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Crear una transcripción
        </NuxtLink>
      </div>

      <!-- Table -->
      <div v-else class="bg-white rounded-lg shadow-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Archivo
              </th>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Estado
              </th>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Fecha
              </th>
              <th class="px-6 py-3 text-left text-sm font-medium text-gray-900">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="transcription in transcriptionStore.transcriptions"
              :key="transcription.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 text-sm text-gray-900">
                {{ transcription.fileName }}
              </td>
              <td class="px-6 py-4 text-sm">
                <span
                  class="px-3 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-yellow-100 text-yellow-800':
                      transcription.status === 'pending',
                    'bg-blue-100 text-blue-800':
                      transcription.status === 'processing',
                    'bg-green-100 text-green-800':
                      transcription.status === 'completed',
                    'bg-red-100 text-red-800':
                      transcription.status === 'failed',
                  }"
                >
                  {{ transcription.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600">
                {{ formatDate(transcription.createdAt) }}
              </td>
              <td class="px-6 py-4 text-sm space-x-2">
                <NuxtLink
                  v-if="transcription.status === 'completed'"
                  :to="`/history/${transcription.id}`"
                  class="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Ver
                </NuxtLink>
                <button
                  v-if="transcription.status === 'completed'"
                  type="button"
                  class="text-green-600 hover:text-green-700 font-medium"
                  @click="handleDownload(transcription.id)"
                >
                  Descargar
                </button>
                <button
                  type="button"
                  class="text-red-600 hover:text-red-700 font-medium"
                  @click="handleDelete(transcription.id)"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="transcriptionStore.transcriptions.length > 0"
        class="mt-6 flex items-center justify-between"
      >
        <div class="text-sm text-gray-600">
          Página {{ transcriptionStore.currentPage }} de
          {{ transcriptionStore.totalPages }}
        </div>
        <div class="space-x-2">
          <button
            type="button"
            :disabled="transcriptionStore.currentPage === 1"
            class="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            @click="goToPage(transcriptionStore.currentPage - 1)"
          >
            Anterior
          </button>
          <button
            type="button"
            :disabled="!transcriptionStore.hasMore"
            class="px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            @click="goToPage(transcriptionStore.currentPage + 1)"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { list, download, remove } = useTranscription();
const transcriptionStore = useTranscriptionStore();
const uiStore = useUiStore();

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const goToPage = async (page: number) => {
  await list(page);
};

const handleDownload = async (id: string) => {
  await download(id);
};

const handleDelete = async (id: string) => {
  if (confirm("¿Estás seguro de que quieres eliminar esta transcripción?")) {
    await remove(id);
  }
};

onMounted(async () => {
  await list(1);
});
</script>
