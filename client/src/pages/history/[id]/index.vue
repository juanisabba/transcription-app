<template>
  <div class="min-h-[calc(100vh-4.5rem)] bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Loading -->
      <div v-if="uiStore.isLoading" class="text-center py-8">
        <p class="text-gray-600">Cargando...</p>
      </div>

      <!-- Content -->
      <div v-else-if="transcription" class="space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              {{ transcription.fileName }}
            </h1>
            <p class="text-gray-600 mt-2">
              {{ formatDate(transcription.createdAt) }}
            </p>
          </div>
          <NuxtLink
            to="/history"
            class="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            ← Volver
          </NuxtLink>
        </div>

        <!-- Audio player (solo si completed y hay audioUrl) -->
        <div
          v-if="
            transcription.status === 'completed' && transcription.audioUrl
          "
          class="bg-white rounded-lg shadow-lg p-6"
        >
          <p class="text-sm font-medium text-gray-600 mb-3">
            Reproducir audio original
          </p>
          <audio
            :src="transcription.audioUrl"
            controls
            class="w-full max-w-md h-10"
          />
        </div>

        <!-- Transcription Content -->
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="prose max-w-none">
            <p
              class="text-gray-700 leading-relaxed whitespace-pre-wrap"
            >
              {{ transcription.content || 'Sin contenido aún' }}
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="bg-white rounded-lg shadow-lg p-8 flex gap-4">
          <button
            type="button"
            class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            @click="handleCopy"
          >
            {{ copySuccess ? '✓ Copiado' : 'Copiar Texto' }}
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            @click="handleDownload"
          >
            Descargar
          </button>
          <button
            type="button"
            class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            @click="handleDelete"
          >
            Eliminar
          </button>
        </div>
      </div>

      <!-- Not Found -->
      <div v-else class="bg-white rounded-lg shadow-lg p-8 text-center">
        <p class="text-gray-600 mb-4">Transcripción no encontrada</p>
        <NuxtLink
          to="/history"
          class="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Volver al historial
        </NuxtLink>
      </div>
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
const route = useRoute();
const { list, download, remove } = useTranscription();
const { repairUtf8Mojibake } = useTextEncoding();
const transcriptionStore = useTranscriptionStore();
const uiStore = useUiStore();

const transcription = computed(() => {
  const id = route.params.id as string;
  const t = transcriptionStore.getTranscriptionById(id);
  if (!t) return null;
  return {
    ...t,
    content: repairUtf8Mojibake(t.content || ''),
  };
});

const copySuccess = ref(false);

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const handleCopy = async () => {
  if (transcription.value?.content) {
    await navigator.clipboard.writeText(transcription.value.content);
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  }
};

const handleDownload = async () => {
  const id = route.params.id as string;
  await download(id, transcription.value?.fileName || 'transcription');
};

const showDeleteModal = ref(false);

const handleDelete = () => {
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  const id = route.params.id as string;
  await remove(id);
  showDeleteModal.value = false;
  await navigateTo('/history');
};

onMounted(async () => {
  if (transcriptionStore.transcriptions.length === 0) {
    await list(1);
  }
});
</script>
