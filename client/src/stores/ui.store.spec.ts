import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useUiStore } from "./ui.store";

describe("ui.store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("inicialmente isLoading es false y no hay mensajes", () => {
    const store = useUiStore();
    expect(store.isLoading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.successMessage).toBeNull();
  });

  it("setLoading actualiza isLoading", () => {
    const store = useUiStore();
    store.setLoading(true);
    expect(store.isLoading).toBe(true);
    store.setLoading(false);
    expect(store.isLoading).toBe(false);
  });

  it("setError actualiza error", () => {
    const store = useUiStore();
    store.setError("Error de prueba");
    expect(store.error).toBe("Error de prueba");
  });

  it("setSuccess actualiza successMessage", () => {
    const store = useUiStore();
    store.setSuccess("Éxito");
    expect(store.successMessage).toBe("Éxito");
  });

  it("clearMessages limpia error y successMessage", () => {
    const store = useUiStore();
    store.setError("Error");
    store.setSuccess("Success");
    store.clearMessages();
    expect(store.error).toBeNull();
    expect(store.successMessage).toBeNull();
  });
});
