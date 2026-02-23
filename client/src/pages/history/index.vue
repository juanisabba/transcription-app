<template>
  <div class="min-h-[calc(100vh-4.5rem)] bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">
            Historial de Transcripciones
          </h1>
          <p class="text-gray-600">Todas tus transcripciones guardadas</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="uiStore.isLoading"
          title="Refrescar tabla"
          @click="handleRefresh"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-5 h-5"
            :class="{ 'animate-spin': uiStore.isLoading }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refrescar
        </button>
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

      <!-- Stats + Content -->
      <template v-else>
        <TranscriptionStats />
        <!-- Empty State -->
        <div
          v-if="transcriptionStore.displayItems.length === 0"
          class="bg-white rounded-lg shadow-lg p-8 text-center"
        >
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
              <th
                class="px-6 py-3 text-center text-sm font-medium text-gray-900"
              >
                Nombre
              </th>
              <th
                class="px-6 py-3 text-center text-sm font-medium text-gray-900"
              >
                Tipo
              </th>
              <th
                class="px-6 py-3 text-center text-sm font-medium text-gray-900"
              >
                Duración
              </th>
              <th
                class="px-6 py-3 text-center text-sm font-medium text-gray-900"
              >
                Fecha
              </th>
              <th
                class="px-6 py-3 text-center text-sm font-medium text-gray-900"
              >
                Estado
              </th>
              <th
                class="px-6 py-3 text-center text-sm font-medium text-gray-900"
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y">
            <tr
              v-for="transcription in transcriptionStore.displayItems"
              :key="transcription.id"
              class="hover:bg-gray-50"
            >
              <td class="px-6 py-4 text-sm text-gray-900 text-center">
                {{ transcription.fileName }}
              </td>
              <td class="px-6 py-4 text-sm text-center">
                <span
                  v-if="transcription.type"
                  class="inline-block px-3 py-1 rounded-full text-xs font-medium"
                  :class="{
                    'bg-indigo-100 text-indigo-800':
                      transcription.type === 'batch',
                    'bg-emerald-100 text-emerald-800':
                      transcription.type === 'realtime',
                  }"
                >
                  {{
                    transcription.type === "batch"
                      ? "Pregrabado"
                      : "Tiempo real"
                  }}
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 text-center">
                <span v-if="typeof transcription.duration === 'number'">
                  {{ formatDuration(transcription.duration) }}
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-600 text-center">
                {{ formatDate(transcription.createdAt) }}
              </td>
              <td class="px-6 py-4 text-sm text-center">
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
                  {{ TRANSCRIPTION_STATUS_LABELS[transcription.status] }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-center">
                <div class="flex items-center justify-center gap-3">
                  <NuxtLink
                    v-if="transcription.status === 'completed'"
                    :to="`/history/${transcription.id}`"
                    class="text-indigo-600 hover:text-indigo-800 transition-colors"
                    title="Ver"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </NuxtLink>
                  <button
                    v-if="transcription.status === 'completed'"
                    type="button"
                    class="text-green-600 hover:text-green-800 transition-colors"
                    title="Descargar"
                    @click="
                      handleDownload(transcription.id, transcription.fileName)
                    "
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="text-red-600 hover:text-red-800 transition-colors"
                    title="Eliminar"
                    @click="handleDelete(transcription.id)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

          <!-- Pagination -->
        <div
          v-if="transcriptionStore.displayItems.length > 0"
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
      </template>
    </div>

    <!-- Delete confirmation modal -->
    <CommonDeleteConfirmationModal
      v-model="showDeleteModal"
      title="Eliminar transcripción"
      message="¿Estás seguro de que quieres eliminar esta transcripción? Esta acción no se puede deshacer."
      :is-loading="uiStore.isLoading"
      @confirm="confirmDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { TRANSCRIPTION_STATUS_LABELS } from "~/types/transcription.types";
import { formatDuration } from "~/utils/format";

const route = useRoute();
const router = useRouter();
const { fetchPage, download, remove } = useTranscription();
const transcriptionStore = useTranscriptionStore();
const uiStore = useUiStore();

function parsePageFromRoute(): number {
  const p = route.query.page;
  const n = typeof p === "string" ? parseInt(p, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

const pageToLoad = ref(parsePageFromRoute());

async function loadPageAndRedirectIfEmpty(page: number) {
  await fetchPage(page);
  if (
    transcriptionStore.currentPage > 1 &&
    transcriptionStore.displayItems.length === 0
  ) {
    await router.replace({ path: route.path, query: { page: "1" } });
    pageToLoad.value = 1;
    await fetchPage(1);
  }
}

watch(
  () => route.query.page,
  async (newPage) => {
    const p = typeof newPage === "string" ? parseInt(newPage, 10) : 1;
    const n = Number.isFinite(p) && p >= 1 ? p : 1;
    if (n !== pageToLoad.value) {
      pageToLoad.value = n;
      await loadPageAndRedirectIfEmpty(n);
    }
  },
);

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
  pageToLoad.value = page;
  await router.replace({
    path: route.path,
    query: { ...route.query, page: String(page) },
  });
  await fetchPage(page);
};

const handleRefresh = async () => {
  transcriptionStore.invalidatePageCache();
  await loadPageAndRedirectIfEmpty(pageToLoad.value);
};

const handleDownload = async (id: string, fileName: string) => {
  await download(id, fileName);
};

const showDeleteModal = ref(false);
const deleteTargetId = ref<string | null>(null);

const handleDelete = (id: string) => {
  deleteTargetId.value = id;
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (deleteTargetId.value) {
    await remove(deleteTargetId.value);
    deleteTargetId.value = null;
    showDeleteModal.value = false;
  }
};

onMounted(async () => {
  if (route.query.page === undefined) {
    await router.replace({ path: route.path, query: { page: "1" } });
    pageToLoad.value = 1;
  } else {
    pageToLoad.value = parsePageFromRoute();
  }
  await loadPageAndRedirectIfEmpty(pageToLoad.value);
});
</script>
