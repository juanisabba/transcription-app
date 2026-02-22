<template>
  <div class="min-h-[calc(100vh-4.5rem)] bg-gradient-to-br from-slate-50 to-indigo-50">
    <div class="max-w-2xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          Transcripción en Tiempo Real
        </h1>
        <p class="text-gray-600">
          Habla por tu micrófono y obtén la transcripción al instante
        </p>
      </div>

      <!-- Success Alert -->
      <div
        v-if="uiStore.successMessage"
        class="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg transition-opacity duration-300"
      >
        {{ uiStore.successMessage }}
      </div>

      <!-- Error Alerts -->
      <div
        v-if="error || uiStore.error"
        class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 transition-opacity duration-300"
      >
        <svg
          class="w-5 h-5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        {{ error || uiStore.error }}
      </div>

      <!-- Main Card -->
      <div
        class="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300"
      >
        <!-- Status Bar -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50"
        >
          <div class="flex items-center gap-3">
            <!-- Microphone Indicator -->
            <div
              class="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300"
              :class="{
                'bg-red-100 text-red-700': isRecording,
                'bg-green-100 text-green-700': isConnected && !isRecording,
                'bg-gray-200 text-gray-500': !isConnected && !isRecording,
              }"
            >
              <span
                class="w-3 h-3 rounded-full transition-all duration-300"
                :class="{
                  'bg-red-500 animate-pulse': isRecording,
                  'bg-green-500': isConnected && !isRecording,
                  'bg-gray-400': !isConnected && !isRecording,
                }"
              />
              <span class="text-sm font-medium">
                {{
                  isRecording
                    ? 'Grabando'
                    : isConnected
                      ? 'Conectado'
                      : 'Desconectado'
                }}
              </span>
            </div>
            <!-- Timer -->
            <span
              class="text-lg font-mono font-medium text-gray-700 tabular-nums"
            >
              {{ recordingDuration }}
            </span>
          </div>
        </div>

        <!-- Transcript Area -->
        <div class="p-6">
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Transcripción en vivo:
          </label>
          <div
            class="min-h-[180px] w-full rounded-lg border border-gray-200 bg-gray-50/50 p-4 text-gray-800 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
          >
            <p
              v-if="transcript"
              class="whitespace-pre-wrap break-words leading-relaxed"
            >
              {{ transcript }}
            </p>
            <p
              v-else
              class="text-gray-400 italic"
            >
              La transcripción aparecerá aquí mientras hablas...
            </p>
          </div>

          <!-- Nombre para guardar (visible cuando puede guardar) -->
          <div v-if="canSave" class="mt-6">
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Nombre de la transcripción
            </label>
            <input
              v-model="realtimeTranscriptionName"
              type="text"
              placeholder="Ej: Entrevista con cliente"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          <!-- Audio Level Visualizer -->
          <div class="mt-6">
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Nivel de audio
            </label>
            <div
              class="h-2 w-full bg-gray-200 rounded-full overflow-hidden transition-all duration-100"
            >
              <div
                class="h-full rounded-full transition-all duration-100"
                :class="{
                  'bg-indigo-500': !isRecording,
                  'bg-red-500': isRecording,
                }"
                :style="{ width: `${Math.min(100, audioLevel + 5)}%` }"
              />
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div
          class="flex flex-wrap gap-3 p-6 pt-0 border-t border-gray-100 pt-6"
        >
          <button
            v-if="!isRecording"
            type="button"
            :disabled="uiStore.isLoading"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
            @click="handleStart"
          >
            <svg
              class="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clip-rule="evenodd"
              />
            </svg>
            {{ transcriptionId ? 'Reiniciar' : 'Iniciar' }}
          </button>

          <template v-else>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow"
              @click="handleStop"
            >
              <svg
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              Detener
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-6 py-2.5 font-medium rounded-lg transition-all duration-200"
              :class="
                isPaused
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              "
              @click="handlePauseResume"
            >
              <svg
                v-if="isPaused"
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clip-rule="evenodd"
                />
              </svg>
              <svg
                v-else
                class="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fill-rule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              {{ isPaused ? 'Reanudar' : 'Pausar' }}
            </button>
          </template>

          <button
            type="button"
            :disabled="!canSave || !realtimeTranscriptionName?.trim() || uiStore.isLoading"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
            @click="handleSave"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  resetSession,
  isRecording,
  isPaused,
  transcript,
  error,
  isConnected,
  transcriptionId,
  durationSeconds,
  audioLevel,
  recordedAudioBlob,
} = useMicrophone({ language: 'es' });

const { saveRealtime } = useTranscription();
const uiStore = useUiStore();

const realtimeTranscriptionName = ref('');

const recordingDuration = computed(() => {
  const sec = durationSeconds.value;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const canSave = computed(
  () =>
    transcriptionId.value &&
    transcript.value.trim().length > 0 &&
    recordedAudioBlob.value &&
    recordedAudioBlob.value.size > 0 &&
    !isRecording.value,
);

// Default name when user stops recording
watch(canSave, (can) => {
  if (can && !realtimeTranscriptionName.value) {
    const date = new Date().toLocaleDateString('es-ES');
    realtimeTranscriptionName.value = `Tiempo Real - ${date}`;
  }
});

async function handleStart() {
  try {
    await startRecording();
  } catch {
    // Error ya mostrado en useMicrophone (error ref)
  }
}

async function handleStop() {
  await stopRecording();
}

function handlePauseResume() {
  if (isPaused.value) {
    resumeRecording();
  } else {
    pauseRecording();
  }
}

async function handleSave() {
  if (
    !transcriptionId.value ||
    !transcript.value.trim() ||
    !recordedAudioBlob.value ||
    recordedAudioBlob.value.size === 0
  ) {
    return;
  }

  const name = realtimeTranscriptionName.value?.trim();
  if (!name) return;

  try {
    await saveRealtime(
      transcriptionId.value,
      transcript.value.trim(),
      recordedAudioBlob.value,
      name,
      durationSeconds.value,
    );
    resetSession();
    realtimeTranscriptionName.value = '';
  } catch {
    // Error ya manejado en useTranscription (uiStore)
  }
}
</script>
