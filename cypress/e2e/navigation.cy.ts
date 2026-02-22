describe("Navegación (usuario autenticado)", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/transcriptions/stats", {
      statusCode: 200,
      body: { totalBatchSeconds: 0, totalRealtimeSeconds: 0 },
    }).as("getStats");
    cy.intercept("GET", /transcriptions(?!\/stats)/, {
      statusCode: 200,
      body: {
        items: [],
        hasMore: false,
        totalPages: 0,
        currentPage: 1,
      },
    }).as("getTranscriptions");
    cy.intercept("POST", "**/transcriptions/realtime/token", {
      statusCode: 200,
      body: { token: "mock-realtime-token", sessionId: "mock-session" },
    }).as("realtimeToken");
    cy.loginWithToken("usuario@test.com");
  });

  it("muestra enlaces de transcripción en landing", () => {
    cy.visit("/");
    cy.contains("Transcribir Archivo").should("be.visible");
    cy.contains("Transcribir en Tiempo Real").should("be.visible");
  });

  it("navbar muestra Subir Audio, Tiempo Real, Historial", () => {
    cy.visit("/");
    cy.get("nav").within(() => {
      cy.contains("Subir Audio");
      cy.contains("Tiempo Real");
      cy.contains("Historial");
    });
  });

  it("navega a Subir Audio desde navbar", () => {
    cy.visit("/");
    cy.get("nav").contains("Subir Audio").click();
    cy.url().should("include", "/transcribe/upload");
    cy.contains("Transcribir Archivo");
  });

  it("navega a Tiempo Real desde navbar", () => {
    cy.visit("/");
    cy.get("nav").contains("Tiempo Real").click();
    cy.url().should("include", "/transcribe/realtime");
  });

  it("navega a Historial desde navbar", () => {
    cy.visit("/");
    cy.get("nav").contains("Historial").click();
    cy.url().should("include", "/history");
    cy.contains("Historial de Transcripciones");
  });

  it("muestra estado vacío en historial cuando no hay transcripciones", () => {
    cy.visit("/history");
    cy.wait("@getTranscriptions");
    cy.contains("No tienes transcripciones aún");
    cy.contains("Crear una transcripción");
  });

  it("cierra sesión correctamente", () => {
    cy.intercept("POST", "**/auth/logout", { statusCode: 200 }).as("logout");

    cy.visit("/transcribe/upload");
    cy.get("nav").find('[data-testid="user-icon"]').click();
    cy.contains("Cerrar Sesión").click();

    cy.wait("@logout");
    cy.url().should("eq", Cypress.config("baseUrl") + "/");
    cy.get("nav").contains("Iniciar Sesión");
  });
});
