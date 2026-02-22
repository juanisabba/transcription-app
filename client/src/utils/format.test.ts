import { describe, it, expect } from "vitest";
import { formatDuration } from "./format";

describe("formatDuration", () => {
  it("formatea segundos menores a 60 como 'X s'", () => {
    expect(formatDuration(0)).toBe("0 s");
    expect(formatDuration(30)).toBe("30 s");
    expect(formatDuration(59)).toBe("59 s");
  });

  it("formatea minutos sin segundos como 'X min'", () => {
    expect(formatDuration(60)).toBe("1 min");
    expect(formatDuration(120)).toBe("2 min");
  });

  it("formatea minutos con segundos como 'X min Y s'", () => {
    expect(formatDuration(90)).toBe("1 min 30 s");
    expect(formatDuration(125)).toBe("2 min 5 s");
  });

  it("formatea horas sin minutos como 'Xh'", () => {
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(7200)).toBe("2h");
  });

  it("formatea horas con minutos como 'Xh Y min'", () => {
    expect(formatDuration(3660)).toBe("1h 1 min");
    expect(formatDuration(7320)).toBe("2h 2 min");
  });
});
