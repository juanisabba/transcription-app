<template>
  <nav class="bg-white shadow sticky top-0 z-40">
    <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
      <!-- Logo -->
      <NuxtLink to="/" class="text-2xl font-bold text-indigo-600">
        Vocali
      </NuxtLink>

      <!-- Navigation Links -->
      <div class="space-x-4 flex items-center">
        <!-- No autenticado -->
        <div v-if="!authStore.isAuthenticated" class="space-x-4">
          <NuxtLink
            to="/auth/login"
            class="px-4 py-2 text-gray-700 hover:text-indigo-600 transition"
          >
            Iniciar Sesión
          </NuxtLink>
          <NuxtLink
            to="/auth/register"
            class="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
          >
            Registrarse
          </NuxtLink>
        </div>

        <!-- Autenticado -->
        <div v-else class="flex items-center space-x-4">
          <NuxtLink
            to="/transcribe/upload"
            class="px-4 py-2 text-gray-700 hover:text-indigo-600 transition"
          >
            Subir Audio
          </NuxtLink>
          <NuxtLink
            to="/history"
            class="px-4 py-2 text-gray-700 hover:text-indigo-600 transition"
          >
            Historial
          </NuxtLink>

          <!-- Dropdown -->
          <div ref="dropdownRef" class="relative">
            <button
              @click="showDropdown = !showDropdown"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center space-x-2"
            >
              <span>{{ authStore.email }}</span>
              <svg
                class="w-4 h-4 transition transform"
                :class="{ 'rotate-180': showDropdown }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="showDropdown"
              class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <button
                @click="handleLogout"
                :disabled="uiStore.isLoading"
                class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition"
              >
                {{ uiStore.isLoading ? "Cerrando sesión..." : "Cerrar Sesión" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuth } from "../../composables/useAuth";
import { onClickOutside } from "@vueuse/core";

const authStore = useAuthStore();
const uiStore = useUiStore();
const { logout } = useAuth();

const showDropdown = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const handleLogout = async () => {
  showDropdown.value = false;
  await logout();
};

// Cerrar dropdown al hacer click afuera
onClickOutside(dropdownRef, () => {
  showDropdown.value = false;
});
</script>
