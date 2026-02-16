describe("Configuración de cuenta", () => {
  beforeEach(() => {
    cy.login();
  });

  it("abre el menu de configuracion y actualiza el email", () => {
    cy.intercept("GET", "**/users/me", {
      statusCode: 200,
      body: {
        id: 1,
        username: "testadmin",
        email: "admin@test.com",
      },
    }).as("getSelfUser");

    cy.intercept("PATCH", "**/users/me", {
      statusCode: 200,
      body: {
        id: 1,
        username: "testadmin",
        email: "nuevo@test.com",
      },
    }).as("updateSelfUser");

    cy.visit("/dashboard");
    cy.contains("Panel de Gestión", { timeout: 10000 }).should("be.visible");

    cy.get('button[aria-label="Configuración de cuenta"]').click();
    cy.get('[role="menu"]').within(() => {
      cy.contains("testadmin").should("be.visible");
      cy.contains("Cerrar sesión").should("be.visible");
      cy.contains("testadmin").click();
    });
    cy.contains("Configuración de cuenta").should("be.visible");

    cy.wait("@getSelfUser");

    cy.get('input[type="email"]').clear().type("nuevo@test.com");
    cy.get('input[autocomplete="current-password"]').type("adminpass");

    cy.contains("button", "Guardar cambios").click();

    cy.wait("@updateSelfUser");
    cy.contains(/actualizado correctamente/i).should("be.visible");
  });
});
