/**
 * Setup para tests: provee las APIs de Vue que Nuxt auto-importa.
 * Los stores y composables las usan sin import explícito.
 */
import * as vue from "vue";

(globalThis as unknown as Record<string, unknown>).ref = vue.ref;
(globalThis as unknown as Record<string, unknown>).computed = vue.computed;
(globalThis as unknown as Record<string, unknown>).reactive = vue.reactive;
(globalThis as unknown as Record<string, unknown>).watch = vue.watch;
