<template>
  <div class="min-h-[calc(100vh-4.5rem)] bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Hero Section -->
    <div class="max-w-6xl mx-auto px-4 py-16 text-center">
      <h2 class="text-4xl font-bold text-gray-900 mb-4">
        Transcribe Audios Fácilmente
      </h2>
      <p class="text-xl text-gray-600 mb-8">
        Sube archivos de audio o transcribe en tiempo real desde tu micrófono
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <NuxtLink
          v-if="!authStore.isAuthenticated"
          to="/auth/register"
          class="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          Comenzar Ahora
        </NuxtLink>
        <template v-if="authStore.isAuthenticated">
          <NuxtLink
            to="/transcribe/upload"
            class="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Transcribir Archivo
          </NuxtLink>
          <NuxtLink
            to="/transcribe/realtime"
            class="inline-block px-8 py-3 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 transition border-2 border-indigo-400"
          >
            Transcribir en Tiempo Real
          </NuxtLink>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore();
authStore.restore();
</script>
