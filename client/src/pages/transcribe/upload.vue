<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Transcribir Archivo</h1>
        <p class="text-gray-600">Sube un archivo de audio (máx 20 MB)</p>
      </div>

      <!-- Error Alert -->
      <div
        v-if="uiStore.error"
        class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
      >
        {{ uiStore.error }}
      </div>

      <!-- Success Alert -->
      <div
        v-if="uiStore.successMessage"
        class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg"
      >
        {{ uiStore.successMessage }}
      </div>

      <!-- Upload Form -->
      <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
        <div class="space-y-6">
          <!-- File Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Selecciona un archivo de audio
            </label>
            <div
              @drop="handleDrop"
              @dragover.prevent
              @dragenter.prevent
              class="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition"
            >
              <input
                ref="fileInput"
                type="file"
                accept="audio/*"
                class="hidden"
                @change="handleFileSelect"
              />
              <button
                type="button"
                class="text-gray-600 hover:text-indigo-600"
                @click="fileInput?.click()"
              >
                <svg
                  class="w-12 h-12 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <p class="font-medium">Haz clic para seleccionar</p>
                <p class="text-sm text-gray-500">o arrastra un archivo aquí</p>
              </button>
            </div>
            <p v-if="errors.file" class="text-red-500 text-sm mt-2">
              {{ errors.file }}
            </p>
          </div>

          <!-- File Preview -->
          <div v-if="selectedFile" class="bg-gray-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900">{{ selectedFile.name }}</p>
                <p class="text-sm text-gray-600">
                  {{ formatFileSize(selectedFile.size) }}
                </p>
              </div>
              <button
                type="button"
                class="text-gray-400 hover:text-gray-600"
                @click="selectedFile = null"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- Upload Button -->
          <button
            type="button"
            :disabled="!selectedFile || uiStore.isLoading"
            class="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            @click="handleUpload"
          >
            {{ uiStore.isLoading ? 'Subiendo...' : 'Subir Archivo' }}
          </button>
        </div>
      </div>

      <!-- Recent Transcriptions -->
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">
          Transcripciones Recientes
        </h2>

        <div
          v-if="transcriptionStore.transcriptions.length === 0"
          class="text-center py-8"
        >
          <p class="text-gray-600">No hay transcripciones aún</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="transcription in transcriptionStore.transcriptions.slice(0, 5)"
            :key="transcription.id"
            class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
          >
            <div>
              <p class="font-medium text-gray-900">{{ transcription.fileName }}</p>
              <p class="text-sm text-gray-600">
                {{ formatDate(transcription.createdAt) }}
              </p>
            </div>
            <span
              class="px-3 py-1 rounded-full text-sm font-medium"
              :class="{
                'bg-yellow-100 text-yellow-800': transcription.status === 'pending',
                'bg-blue-100 text-blue-800': transcription.status === 'processing',
                'bg-green-100 text-green-800': transcription.status === 'completed',
                'bg-red-100 text-red-800': transcription.status === 'failed',
              }"
            >
              {{ transcription.status }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { uploadWithConfirmation, list } = useTranscription();
const transcriptionStore = useTranscriptionStore();
const uiStore = useUiStore();

const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const errors = reactive({
  file: '',
});

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const validateFile = (file: File): boolean => {
  errors.file = '';

  if (!file.type.startsWith('audio/')) {
    errors.file = 'El archivo debe ser un audio válido';
    return false;
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.file = `El archivo no debe superar ${formatFileSize(MAX_FILE_SIZE)}`;
    return false;
  }

  return true;
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file && validateFile(file)) {
    selectedFile.value = file;
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file && validateFile(file)) {
    selectedFile.value = file;
  }
};

const handleUpload = async () => {
  if (!selectedFile.value) return;

  try {
    await uploadWithConfirmation(selectedFile.value);
    selectedFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
    await list(1);
  } catch {
    // Error ya manejado en el composable (uiStore.setError)
  }
};

onMounted(async () => {
  await list(1);
});
</script>
