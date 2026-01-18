describe("Exportación de Jornadas", () => {
  const sessionId = 101;

  beforeEach(() => {
    // Asumimos que existe un comando custom cy.login configurado en support/commands.ts
    cy.login("testadmin", "adminpass");
  });

  it("Debe descargar el Excel correctamente desde la pestaña de Resumen por Servicios", () => {
    // 1. Interceptar carga inicial de la tabla de resultados (pestaña por defecto "matched")
    // Esto evita errores de consola o esperas innecesarias al cargar la página
    cy.intercept("GET", `**/jornadas/${sessionId}?*`, {
      statusCode: 200,
      body: {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
        stats: {
          total: 0,
          completo: 0,
          incompleto: 0,
          sinPresencia: 0,
          revisar: 0,
        },
      },
    }).as("getResults");

    // 2. Interceptar datos del resumen por servicios (la pestaña que vamos a probar)
    cy.intercept("GET", `**/jornadas/${sessionId}/service-summary`, {
      statusCode: 200,
      body: {
        rows: [
          { servicio: "Servicio A", jornadas: 10.5 },
          { servicio: "Servicio B", jornadas: 5.2 },
        ],
        total: 15.7,
      },
    }).as("getServiceSummary");

    // 3. Interceptar la petición de exportación
    cy.intercept("GET", `**/jornadas/${sessionId}/export`, {
      statusCode: 200,
      // Simulamos un contenido binario dummy
      body: Cypress.Buffer.from("fake-excel-content"),
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="jornadas_${sessionId}.xlsx"`,
      },
    }).as("exportRequest");

    // 4. Navegar a la página de la sesión
    cy.visit(`/dashboard/jornadas/${sessionId}`);
    cy.wait("@getResults");

    // 5. Cambiar a la pestaña "Resumen por Servicios"
    cy.contains("button", "Resumen por Servicios").click();
    cy.wait("@getServiceSummary");

    // Verificar que la tabla se ha renderizado con los datos mockeados
    cy.contains("Servicio A").should("be.visible");
    cy.contains("10.50").should("be.visible");

    // 6. Hacer clic en "Exportar Excel" y verificar la llamada
    cy.contains("button", "Exportar Excel").click();

    cy.wait("@exportRequest").its("response.statusCode").should("eq", 200);
  });
});
