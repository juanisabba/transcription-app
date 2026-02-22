import { describe, it, expect } from "vitest";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
  it("inicializa en página 1", () => {
    const { currentPage } = usePagination();
    expect(currentPage.value).toBe(1);
  });

  it("goToPage actualiza la página", () => {
    const { currentPage, goToPage } = usePagination();
    goToPage(3);
    expect(currentPage.value).toBe(3);
  });

  it("goToPage no permite página menor a 1", () => {
    const { currentPage, goToPage } = usePagination();
    goToPage(0);
    expect(currentPage.value).toBe(1);
    goToPage(-5);
    expect(currentPage.value).toBe(1);
  });

  it("nextPage incrementa la página", () => {
    const { currentPage, nextPage } = usePagination();
    nextPage();
    expect(currentPage.value).toBe(2);
    nextPage();
    expect(currentPage.value).toBe(3);
  });

  it("prevPage decrementa la página", () => {
    const { currentPage, prevPage, goToPage } = usePagination();
    goToPage(3);
    prevPage();
    expect(currentPage.value).toBe(2);
    prevPage();
    expect(currentPage.value).toBe(1);
  });

  it("prevPage no baja de 1", () => {
    const { currentPage, prevPage } = usePagination();
    expect(currentPage.value).toBe(1);
    prevPage();
    expect(currentPage.value).toBe(1);
  });
});
