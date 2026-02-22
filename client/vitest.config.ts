import { defineConfig } from "vitest/config";
import AutoImport from "unplugin-auto-import/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [
    AutoImport({
      dts: false,
      imports: ["vue", "pinia", { "vue-router": ["useRouter"] }],
      dirs: ["src/stores", "src/composables"],
    }),
  ],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
      "~/": fileURLToPath(new URL("./src/", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,ts,vue}"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,vue}"],
      exclude: [
        "node_modules/",
        ".nuxt/",
        ".output/",
        "vitest.config.ts",
        "vitest.setup.ts",
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/*.d.ts",
      ],
    },
  },
});
