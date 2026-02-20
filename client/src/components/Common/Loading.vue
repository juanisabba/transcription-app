<template>
  <div
    v-if="uiStore.isLoading"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-lg p-8">
      <div
        class="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"
      ></div>
      <p class="mt-4 text-gray-600">Cargando...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const uiStore = useUiStore();
</script>
