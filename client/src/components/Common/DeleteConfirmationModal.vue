<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <!-- Overlay -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleClose"
        />

        <!-- Modal content -->
        <div class="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <!-- Icon -->
          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4"
          >
            <svg
              class="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>

          <h3
            id="delete-modal-title"
            class="text-lg font-semibold text-gray-900 text-center mb-2"
          >
            {{ title }}
          </h3>
          <p class="text-gray-600 text-center mb-6">
            {{ message }}
          </p>

          <div class="flex gap-3 justify-center">
            <button
              type="button"
              class="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              @click="handleClose"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isLoading"
              @click="handleConfirm"
            >
              {{ isLoading ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  title?: string;
  message?: string;
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

function handleClose() {
  emit('update:modelValue', false);
  emit('cancel');
}

function handleConfirm() {
  emit('confirm');
}

// Cerrar con Escape
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') handleClose();
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown);
    } else {
      window.removeEventListener('keydown', onKeydown);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
