<template>
  <Transition name="fade">
    <div
      v-if="uiStore.error"
      class="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg"
    >
      {{ uiStore.error }}
    </div>
  </Transition>
</template>

<script setup lang="ts">
const uiStore = useUiStore();
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
