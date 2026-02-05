describe("Partes de trabajo - PDF", () => {
  beforeEach(() => {
    cy.intercept("GET", "/api/departamentos", {
      statusCode: 200,
      body: [
        { id: 1, nombre: "Servicios Operativos" },
        { id: 2, nombre: "Limpieza" },
      ],
    }).as("getDepartamentos");

    cy.login();
    cy.visitProtected("/dashboard/generar-parte-trabajo");
    cy.wait("@getDepartamentos");
  });

  it("permite completar el formulario y ver la vista previa", () => {
    cy.contains("Formulario de Parte de Trabajo").should("be.visible");

    cy.get('input[name="numeroDocumento"]').type("PT-2026");
    cy.get('input[name="solicitante"]').type("Carlos");
    cy.get('textarea[name="direccion"]').type("Calle 1");
    cy.get('textarea[name="descripcion"]').type("Trabajo realizado");

    cy.contains("label", "Servicios").click();
    cy.contains("li", "Servicios Operativos").click();
    cy.contains("li", "Limpieza").click();
    cy.get("body").type("{esc}");

    cy.contains(/se generar[aá]n 2 pdfs/i).should("be.visible");

    cy.contains("button", "Vista Previa").click();
    cy.contains("Vista Previa del PDF").should("be.visible");
    cy.contains("PARTE DE TRABAJO").should("be.visible");
  });
});
