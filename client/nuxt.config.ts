import { defineNuxtConfig } from "nuxt/config";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  srcDir: "src/",

  devServer: {
    port: 3000,
  },
  vite: {
    server: {
      strictPort: true,
    },
  },

  ssr: false, // Client-Side Rendering

  css: ["~/assets/css/main.css"],

  modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss", "@vueuse/nuxt"],

  runtimeConfig: {
    public: {
      // API: NUXT_PUBLIC_API_URL sobrescribe. Default = prod.
      apiUrl: process.env.NUXT_PUBLIC_API_URL || "http://localhost:3001",
      // apiUrl: "https://qucod37on2.execute-api.eu-north-1.amazonaws.com/prod",
      // Cognito: NUXT_PUBLIC_COGNITO_USER_POOL_ID y NUXT_PUBLIC_COGNITO_CLIENT_ID.
      // Cuando apuntes a prod, configurar con los valores de producción.
      cognitoUserPoolId: "",
      cognitoClientId: "",
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
