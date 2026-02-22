import { describe, it, expect } from "vitest";
import { useTextEncoding } from "./useTextEncoding";

describe("useTextEncoding", () => {
  const { repairUtf8Mojibake } = useTextEncoding();

  it("repara texto con mojibake UTF-8 interpretado como Latin-1", () => {
    // "ó" en UTF-8 como bytes: 0xC3 0xB3. Si se interpreta como Latin-1: Ã³
    expect(repairUtf8Mojibake("Ã³")).toBe("ó");
    expect(repairUtf8Mojibake("niÃ±o")).toBe("niño");
    expect(repairUtf8Mojibake("cafÃ©")).toBe("café");
  });

  it("devuelve string vacío sin cambios", () => {
    expect(repairUtf8Mojibake("")).toBe("");
  });

  it("devuelve el original si no hay mojibake", () => {
    const text = "Hola mundo";
    expect(repairUtf8Mojibake(text)).toBe(text);
  });

  it("devuelve el original si el resultado contiene replacement char", () => {
    // Caracteres que al decodificar producen � (U+FFFD) se dejan como están
    const invalid = "abc\x80\x81";
    expect(repairUtf8Mojibake(invalid)).toBe(invalid);
  });

  it("maneja null/undefined devolviendo el valor", () => {
    expect(repairUtf8Mojibake("")).toBe("");
  });
});
