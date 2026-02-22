describe("Transcripción por Upload", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/transcriptions*", {
      statusCode: 200,
      body: {
        items: [],
        hasMore: false,
        totalPages: 0,
        currentPage: 1,
      },
    });
    cy.loginWithToken();
    cy.visit("/transcribe/upload");
  });

  it("muestra el formulario de subida", () => {
    cy.contains("h1", "Transcribir Archivo");
    cy.contains("Sube un archivo de audio");
    cy.contains("Selecciona un archivo de audio");
  });

  it("acepta solo archivos de audio en el input", () => {
    cy.get('input[type="file"]').should("have.attr", "accept", "audio/*");
  });

  it("zona de drop es clickeable", () => {
    cy.contains("Haz clic para seleccionar").click();
    // El input file debería existir (no podemos ver el diálogo del OS en Cypress)
    cy.get('input[type="file"]').should("exist");
  });
});
