/// <reference path="../.nuxt/nuxt.d.ts" />

import { useAuthStore } from "../src/stores/auth.store";

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore();

  authStore.restore();

  // Rutas públicas (accesibles sin autenticación)
  const publicPaths = ["/", "/auth/login", "/auth/register"];
  const isPublic = publicPaths.includes(to.path);

  if (!authStore.isAuthenticated && !isPublic) {
    return navigateTo("/auth/login");
  }

  // Si está autenticado, no puede ir a login/register
  if (authStore.isAuthenticated && to.path.startsWith("/auth")) {
    return navigateTo("/");
  }
});
