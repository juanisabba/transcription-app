import { defineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  srcDir: "src/",

  devServer: {
    port: 3000,
    strictPort: true,
  },

  ssr: false, // Client-Side Rendering

  css: ["~/assets/css/main.css"],

  modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss", "@vueuse/nuxt"],

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || "http://localhost:3001",
    },
  },

  typescript: {
    strict: true,
  },

  imports: {
    autoImport: true,
    dirs: ["./composables"],
  },
});
