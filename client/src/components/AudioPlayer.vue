<template>
  <div
    v-if="audioUrl"
    class="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-sm border border-slate-200"
  >
    <p class="text-sm font-medium text-slate-600 mb-3">Reproducir audio original</p>
    <audio
      :src="audioUrl"
      controls
      controlslist="nodownload"
      class="w-full h-10 rounded-lg accent-indigo-600"
      preload="metadata"
    >
      Tu navegador no soporta el elemento de audio.
    </audio>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  audioUrl: string | undefined;
}>();
</script>
