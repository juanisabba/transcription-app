<template>
  <div class="min-h-[calc(100vh-4.5rem)] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <h1 class="text-3xl font-bold mb-2 text-center">
        <span class="text-black">Invox</span>
        <span class="text-gray-600"> Medical</span>
      </h1>
      <p class="text-gray-500 text-center mb-8">Transcribe your audio easily</p>

      <!-- Error Alert -->
      <div
        v-if="uiStore.error"
        class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
      >
        {{ uiStore.error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            placeholder="tu@email.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <p v-if="errors.email" class="text-red-500 text-sm mt-1">
            {{ errors.email }}
          </p>
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <p v-if="errors.password" class="text-red-500 text-sm mt-1">
            {{ errors.password }}
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="uiStore.isLoading"
          class="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {{ uiStore.isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión' }}
        </button>
      </form>

      <!-- Register Link -->
      <p class="text-center text-gray-600 mt-6">
        ¿No tienes cuenta?
        <NuxtLink to="/auth/register" class="text-indigo-600 font-medium hover:underline">
          Regístrate aquí
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LoginRequest } from '../../types/auth.types';

const { login } = useAuth();
const authStore = useAuthStore();
const uiStore = useUiStore();
const router = useRouter();

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push('/');
  }
});

const form = reactive<LoginRequest>({
  email: '',
  password: '',
});

const errors = reactive({
  email: '',
  password: '',
});

const validateForm = (): boolean => {
  errors.email = '';
  errors.password = '';

  if (!form.email) {
    errors.email = 'El email es requerido';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Email inválido';
  }

  if (!form.password) {
    errors.password = 'La contraseña es requerida';
  } else if (form.password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres';
  }

  return !errors.email && !errors.password;
};

const handleLogin = async () => {
  if (!validateForm()) {
    return;
  }
  await login(form);
};
</script>
