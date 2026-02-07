describe("Partes de trabajo - PDF", () => {
  beforeEach(() => {
    // Interceptar la carga del archivo de servicios para proporcionar datos controlados
    cy.intercept("GET", "/servicios-orden-trabajo.txt", {
      statusCode: 200,
      body: `Almacén
Brigada Operativa
Limpieza
Pintura y rotulación
Parque Móvil
Servicio eléctrico`,
    }).as("getServicios");

    cy.login();
    cy.visit("/dashboard/generar-parte-trabajo");
    cy.contains("Panel de Gestión", { timeout: 10000 }).should("be.visible");
    cy.wait("@getServicios", { timeout: 5000 });
  });

  it("permite completar el formulario y ver la vista previa", () => {
    cy.contains("Formulario de Orden de Trabajo").should("be.visible");

    cy.get('input[name="numeroDocumento"]').type("PT-2026");
    cy.get('input[name="solicitante"]').type("Carlos");
    cy.get('textarea[name="direccion"]').type("Calle 1");
    cy.get('textarea[name="descripcion"]').type("Trabajo realizado");

    // Hacer clic en el Select de Servicios (buscar por el div que contiene el select)
    cy.get('div[id*="servicios"]').first().click();

    // Esperar a que se abra el listbox y hacer clic en las opciones
    cy.contains("li", "Almacén").click();
    cy.contains("li", "Limpieza").click();

    // Cerrar el listbox presionando Escape
    cy.get("body").type("{esc}");

    cy.contains(/se generar[aá]n 2 pdfs/i).should("be.visible");

    cy.contains("button", "Vista Previa").click();
    cy.contains("Vista Previa del PDF").should("be.visible");
    cy.contains("ORDEN DE TRABAJO").should("be.visible");
  });
});
