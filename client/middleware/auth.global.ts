/// <reference path="../.nuxt/nuxt.d.ts" />

import { useAuthStore } from "../src/stores/auth.store";

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore();

  authStore.restore();

  // Rutas protegidas
  const protectedRoutes = ["/transcribe", "/history"];
  const isProtected = protectedRoutes.some((route) =>
    to.path.startsWith(route),
  );

  if (isProtected && !authStore.isAuthenticated) {
    return navigateTo("/auth/login");
  }

  // Si está autenticado, no puede ir a login/register
  if (authStore.isAuthenticated && to.path.startsWith("/auth")) {
    return navigateTo("/");
  }
});
