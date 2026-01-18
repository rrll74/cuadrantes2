describe("Detalle de Jornadas", () => {
  const sessionId = 101;

  beforeEach(() => {
    // Asumimos que existe un comando custom cy.login configurado en support/commands.ts
    cy.login("testadmin", "adminpass");
  });

  it("Muestra el gráfico de evolución de jornadas en la pestaña de detalle", () => {
    // 1. Interceptar carga inicial de la tabla de resultados
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

    // 2. Interceptar datos de la tabla detallada (que alimenta el gráfico)
    cy.intercept("GET", `**/jornadas/${sessionId}/table-detail`, {
      statusCode: 200,
      body: {
        columns: [
          { key: "2023-10-01", label: "01 D" },
          { key: "2023-10-02", label: "02 L" },
          { key: "2023-10-03", label: "03 M" },
        ],
        rows: [
          {
            servicio: "Servicio Test",
            equipo: "Equipo Test",
            total: 15,
            "2023-10-01": 5,
            "2023-10-02": 5,
            "2023-10-03": 5,
          },
        ],
        footer: {
          servicio: "TOTAL",
          equipo: "",
          total: 15,
          "2023-10-01": 5,
          "2023-10-02": 5,
          "2023-10-03": 5,
        },
      },
    }).as("getTableDetail");

    // 3. Navegar a la página de la sesión
    cy.visit(`/dashboard/jornadas/${sessionId}`);
    cy.wait("@getResults");

    // 4. Cambiar a la pestaña "Tabla por Servicios/Equipos"
    cy.contains("button", "Tabla por Servicios/Equipos").click();
    cy.wait("@getTableDetail");

    // 5. Verificar que el título del gráfico está visible
    cy.contains("Evolución de Jornadas por Día").should("be.visible");

    // 6. Verificar que el gráfico se renderiza
    // Recharts renderiza un SVG con la clase 'recharts-surface'
    cy.get(".recharts-surface").should("be.visible");

    // Verificar que existe la línea del gráfico
    cy.get(".recharts-line").should("exist");

    // Verificar que la leyenda está presente
    cy.contains("Total Jornadas").should("be.visible");
  });

  it("Muestra el botón de descarga de imagen y funciona sin errores", () => {
    // 1. Interceptar carga inicial
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

    // 2. Interceptar datos de la tabla detallada
    cy.intercept("GET", `**/jornadas/${sessionId}/table-detail`, {
      statusCode: 200,
      body: {
        columns: [{ key: "2023-10-01", label: "01 D" }],
        rows: [],
        footer: {
          servicio: "TOTAL",
          equipo: "",
          total: 0,
          "2023-10-01": 0,
        },
      },
    }).as("getTableDetail");

    // 3. Navegar y cambiar pestaña
    cy.visit(`/dashboard/jornadas/${sessionId}`);
    cy.wait("@getResults");
    cy.contains("button", "Tabla por Servicios/Equipos").click();
    cy.wait("@getTableDetail");

    // 4. Verificar botón y clic
    cy.contains("button", "Descargar PNG").should("be.visible").click();
  });
});
