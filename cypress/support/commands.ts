/// <reference types="cypress" />

/**
 * Simula un usuario autenticado inyectando el token en localStorage.
 * Útil para tests que requieren estar logueados sin llamar al API real.
 */
Cypress.Commands.add("loginWithToken", (email = "test@example.com") => {
  const mockAuth = {
    userId: "test-user-123",
    email,
    accessToken: "mock-access-token-e2e",
    idToken: "mock-jwt-token-for-e2e",
    refreshToken: "mock-refresh",
    expiresIn: 3600,
  };

  cy.visit("/");
  cy.window().then((win) => {
    win.localStorage.setItem("token", mockAuth.idToken);
    win.localStorage.setItem("accessToken", mockAuth.accessToken);
  });
  cy.reload();
  cy.url().should("include", "/");
});

/**
 * Intercepta el login/register y simula respuesta exitosa.
 * Permite probar el flujo de auth completo sin backend real.
 */
Cypress.Commands.add("mockAuthSuccess", (email = "test@example.com") => {
  const mockResponse = {
    userId: "mock-user-id",
    email,
    accessToken: "mock-access-token",
    idToken: "mock-jwt-token",
    refreshToken: "mock-refresh-token",
    expiresIn: 3600,
  };

  cy.intercept("POST", "**/auth/login", {
    statusCode: 200,
    body: mockResponse,
  }).as("login");

  cy.intercept("POST", "**/auth/register", {
    statusCode: 200,
    body: mockResponse,
  }).as("register");
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginWithToken(email?: string): Chainable<void>;
      mockAuthSuccess(email?: string): Chainable<void>;
    }
  }
}
