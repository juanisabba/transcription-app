<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
  >
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
      <h1 class="text-3xl font-bold text-gray-900 mb-2 text-center">Vocali</h1>
      <p class="text-gray-500 text-center mb-8">Crea tu cuenta</p>

      <!-- Error Alert -->
      <div
        v-if="uiStore.error"
        class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
      >
        {{ uiStore.error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleRegister" class="space-y-4">
        <!-- Email -->
        <div>
          <label
            for="email"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
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
          <label
            for="password"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
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
          <p class="text-gray-500 text-xs mt-1">
            Mínimo 8 caracteres, con mayúscula, número y símbolo
          </p>
          <p v-if="errors.password" class="text-red-500 text-sm mt-1">
            {{ errors.password }}
          </p>
        </div>

        <!-- Confirm Password -->
        <div>
          <label
            for="confirmPassword"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirmar Contraseña
          </label>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <p v-if="errors.confirmPassword" class="text-red-500 text-sm mt-1">
            {{ errors.confirmPassword }}
          </p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="uiStore.isLoading"
          class="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {{ uiStore.isLoading ? "Registrando..." : "Registrarse" }}
        </button>
      </form>

      <!-- Login Link -->
      <p class="text-center text-gray-600 mt-6">
        ¿Ya tienes cuenta?
        <NuxtLink
          to="/auth/login"
          class="text-indigo-600 font-medium hover:underline"
        >
          Inicia sesión aquí
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RegisterForm } from "../../types/auth.types";

const { register } = useAuth();
const authStore = useAuthStore();
const uiStore = useUiStore();
const router = useRouter();

onMounted(() => {
  if (authStore.isAuthenticated) {
    router.push("/transcribe/upload");
  }
});

const form = reactive<RegisterForm>({
  email: "",
  password: "",
  confirmPassword: "",
});

const errors = reactive({
  email: "",
  password: "",
  confirmPassword: "",
});

const validatePassword = (password: string): boolean => {
  // Mínimo 8 caracteres
  if (password.length < 8) return false;
  // Al menos una mayúscula
  if (!/[A-Z]/.test(password)) return false;
  // Al menos una minúscula
  if (!/[a-z]/.test(password)) return false;
  // Al menos un número
  if (!/[0-9]/.test(password)) return false;
  // Al menos un símbolo
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  return true;
};

const validateForm = (): boolean => {
  errors.email = "";
  errors.password = "";
  errors.confirmPassword = "";

  // Validar email
  if (!form.email) {
    errors.email = "El email es requerido";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Email inválido";
  }

  // Validar contraseña
  if (!form.password) {
    errors.password = "La contraseña es requerida";
  } else if (!validatePassword(form.password)) {
    errors.password = "Mínimo 8 caracteres, mayúscula, número y símbolo";
  }

  // Validar confirmación
  if (!form.confirmPassword) {
    errors.confirmPassword = "Confirma tu contraseña";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Las contraseñas no coinciden";
  }

  return !errors.email && !errors.password && !errors.confirmPassword;
};

const handleRegister = async () => {
  if (!validateForm()) {
    return;
  }

  // Enviar solo email y password al backend
  await register({
    email: form.email,
    password: form.password,
  });
};
</script>
