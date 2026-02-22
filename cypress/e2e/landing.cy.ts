describe("Landing Page", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("muestra el título y descripción principal", () => {
    cy.contains("h2", "Transcribe Audios Fácilmente");
    cy.contains("Sube archivos de audio o transcribe en tiempo real desde tu micrófono");
  });

  it("muestra enlace Comenzar Ahora cuando no está autenticado", () => {
    cy.contains("a", "Comenzar Ahora").should("be.visible").and("have.attr", "href").and("include", "/auth/register");
  });

  it("navega a registro al hacer clic en Comenzar Ahora", () => {
    cy.contains("a", "Comenzar Ahora").click();
    cy.url().should("include", "/auth/register");
  });

  it("muestra navbar con Invox Medical, Iniciar Sesión y Registrarse cuando no autenticado", () => {
    cy.get("nav").within(() => {
      cy.contains("Invox Medical");
      cy.contains("Iniciar Sesión");
      cy.contains("Registrarse");
    });
  });
});
