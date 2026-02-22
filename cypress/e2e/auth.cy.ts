describe("Autenticación", () => {
  describe("Login", () => {
    beforeEach(() => {
      cy.visit("/auth/login");
    });

    it("muestra el formulario de login", () => {
      cy.get("h1").contains("Invox Medical");
      cy.get("input#email").should("be.visible");
      cy.get("input#password").should("be.visible");
      cy.contains("button", "Iniciar Sesión");
    });

    it("muestra errores de validación con campos vacíos", () => {
      cy.get("form").invoke("attr", "novalidate", "");
      cy.contains("button", "Iniciar Sesión").click();
      cy.contains("El email es requerido");
      cy.contains("La contraseña es requerida");
    });

    it("muestra error con email inválido", () => {
      cy.get("form").invoke("attr", "novalidate", "");
      cy.get("input#email").type("email-invalido");
      cy.get("input#password").type("password123");
      cy.contains("button", "Iniciar Sesión").click();
      cy.contains("Email inválido");
    });

    it("muestra error con contraseña corta", () => {
      cy.get("input#email").type("test@example.com");
      cy.get("input#password").type("12345");
      cy.contains("button", "Iniciar Sesión").click();
      cy.contains("al menos 6 caracteres");
    });

    it("login exitoso con mock redirige a upload", () => {
      cy.mockAuthSuccess("usuario@test.com");

      cy.get("input#email").type("usuario@test.com");
      cy.get("input#password").type("Password1!");
      cy.contains("button", "Iniciar Sesión").click();

      cy.wait("@login");
      cy.url().should("include", "/transcribe/upload");
    });

    it("enlace a registro funciona", () => {
      cy.contains("Regístrate aquí").click();
      cy.url().should("include", "/auth/register");
    });
  });

  describe("Registro", () => {
    beforeEach(() => {
      cy.visit("/auth/register");
    });

    it("muestra el formulario de registro", () => {
      cy.get("h1").contains("Invox Medical");
      cy.get("input#email").should("be.visible");
      cy.get("input#password").should("be.visible");
      cy.get("input#confirmPassword").should("be.visible");
      cy.contains("button", "Registrarse");
    });

    it("muestra errores de validación", () => {
      cy.get("form").invoke("attr", "novalidate", "");
      cy.contains("button", "Registrarse").click();
      cy.contains("El email es requerido");
      cy.contains("La contraseña es requerida");
    });

    it("muestra error cuando las contraseñas no coinciden", () => {
      cy.get("input#email").type("test@example.com");
      cy.get("input#password").type("Password1!");
      cy.get("input#confirmPassword").type("Password2!");
      cy.contains("button", "Registrarse").click();
      cy.contains("Las contraseñas no coinciden");
    });

    it("registro exitoso con mock redirige a upload", () => {
      cy.mockAuthSuccess("nuevo@test.com");

      cy.get("input#email").type("nuevo@test.com");
      cy.get("input#password").type("Password1!");
      cy.get("input#confirmPassword").type("Password1!");
      cy.contains("button", "Registrarse").click();

      cy.wait("@register");
      cy.url().should("include", "/transcribe/upload");
    });

    it("enlace a login funciona", () => {
      cy.contains("Inicia sesión aquí").click();
      cy.url().should("include", "/auth/login");
    });
  });
});
