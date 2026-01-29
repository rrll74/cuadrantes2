describe("Jornadas Query - E2E Tests", () => {
  const sessionId = 123;

  beforeEach(() => {
    // Login y navegación
    cy.login("testadmin", "adminpass");
  });

  describe("Tabla de Resultados de Sesión", () => {
    it("Debe cargar y mostrar resultados de sesión con paginación", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      // Esperar a que cargue la tabla
      cy.intercept("GET", `**/jornadas/${sessionId}*`, {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
              },
              ruta: {
                equipo: "Equipo A",
              },
              estado: "completo",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: "2024-01-01T16:00:00Z",
              discounted: false,
            },
          ],
          meta: { page: 1, limit: 10, total: 25, totalPages: 3 },
        },
      }).as("getResults");

      cy.wait("@getResults");
      cy.contains("Juan").should("be.visible");
      cy.contains("Equipo A").should("be.visible");
    });

    it("Debe filtrar resultados por estado", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      // Filtrar por COMPLETO
      cy.intercept("GET", `**/jornadas/${sessionId}?*status=completo*`, {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              trabajador: { nombre: "Juan", apellido1: "Pérez" },
              estado: "completo",
            },
          ],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("filterByEstado");

      cy.get("select").contains("Completo").parent().select("Completo");
      cy.wait("@filterByEstado", { timeout: 5000 }).then(() => {
        cy.contains("Juan").should("be.visible");
      });
    });

    it("Debe buscar trabajadores por nombre", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}?*search=Juan*`, {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              trabajador: { nombre: "Juan", apellido1: "Pérez" },
              estado: "completo",
            },
          ],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("search");

      cy.get("input[placeholder*='Nombre, apellido, equipo...']").type("Juan");
      cy.wait("@search", { timeout: 5000 });
      cy.contains("Juan").should("be.visible");
    });
  });

  describe("Tabla de Resultados Sin Asignar", () => {
    it("Debe mostrar fichas sin trabajador asignado", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/unmatched*`, {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              fecha: "2024-01-01",
              fichajeEntrada: "2024-01-01T08:00:00Z",
              fichajeSalida: null,
              estado: "incompleto",
              trabajador: null,
            },
          ],
          meta: { total: 1, totalPages: 1 },
        },
      }).as("getUnmatched");

      cy.contains("Fichajes sin Ruta").click();

      cy.wait("@getUnmatched");
      cy.contains("Sin asignar").should("be.visible");
    });

    it("Debe filtrar fichas sin asignar por estado", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/unmatched*`, {
        statusCode: 200,
        body: {
          data: [],
          meta: { total: 0, totalPages: 0 },
        },
      }).as("getUnmatchedEmpty");

      cy.contains("Fichajes sin Ruta").click();

      cy.get("select").select("Sin Presencia");
      cy.wait("@getUnmatchedEmpty");
    });
  });

  describe("Tabla Detallada de Jornadas", () => {
    it("Debe cargar tabla detallada con colores por estado", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/table-detail`, {
        statusCode: 200,
        body: {
          columns: [
            { key: "2024-01-01", label: "01 L" },
            { key: "2024-01-02", label: "02 M" },
          ],
          rows: [
            {
              servicio: "Servicio A",
              equipo: "Equipo 1",
              total: 20,
              "2024-01-01_value": 10,
              "2024-01-01_color": "GREEN",
              "2024-01-02_value": 10,
              "2024-01-02_color": "YELLOW",
            },
          ],
          footer: {
            servicio: "TOTAL",
            equipo: "",
            total: 20,
            "2024-01-01_value": 10,
            "2024-01-02_value": 10,
          },
        },
      }).as("getTableDetail");

      cy.contains("Tabla por Servicios/Equipos").click();

      cy.wait("@getTableDetail");
      cy.contains("Servicio A").scrollIntoView().should("be.visible");
      cy.contains("Equipo 1").should("be.visible");
    });

    it("Debe mostrar gráfico de evolución de jornadas", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/table-detail`, {
        statusCode: 200,
        body: {
          columns: [
            { key: "2024-01-01", label: "01 L" },
            { key: "2024-01-02", label: "02 M" },
          ],
          rows: [],
          footer: {
            servicio: "TOTAL",
            equipo: "",
            total: 20,
            "2024-01-01_value": 10,
            "2024-01-02_value": 10,
          },
        },
      }).as("getTableDetail");

      cy.contains("Tabla por Servicios/Equipos").click();

      cy.wait("@getTableDetail");
      cy.contains("Evolución de Jornadas por Día").should("be.visible");
      // Verificar que el gráfico está presente
      cy.get("[data-testid='line-chart'], svg").should("exist");
    });

    it("Debe mostrar tabla de equipos descontados", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/table-detail`, {
        statusCode: 200,
        body: {
          columns: [{ key: "2024-01-01", label: "01 L" }],
          rows: [
            {
              servicio: "Servicio A",
              equipo: "Equipo 1",
              total: 10,
              "2024-01-01_value": 10,
            },
          ],
          footer: {
            servicio: "TOTAL",
            equipo: "",
            total: 10,
            "2024-01-01_value": 10,
          },
          discountedRows: [
            {
              servicio: "Servicio B",
              equipo: "Equipo Descuento",
              total: 5,
              "2024-01-01_value": 5,
            },
          ],
          discountedFooter: {
            servicio: "TOTAL DESCONTADO",
            equipo: "",
            total: 5,
            "2024-01-01_value": 5,
          },
        },
      }).as("getTableDetail");

      cy.contains("Tabla por Servicios/Equipos").click();

      cy.wait("@getTableDetail");
      cy.contains("Equipos Descontados").scrollIntoView().should("be.visible");
      cy.contains("Equipo Descuento").should("be.visible");
    });

    it("Debe descargar PNG del gráfico", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/table-detail`, {
        statusCode: 200,
        body: {
          columns: [{ key: "2024-01-01", label: "01 L" }],
          rows: [],
          footer: {
            servicio: "TOTAL",
            equipo: "",
            total: 10,
            "2024-01-01_value": 10,
          },
        },
      }).as("getTableDetail");

      cy.contains("Tabla por Servicios/Equipos").click();

      cy.wait("@getTableDetail");
      cy.contains("Descargar PNG").click();
      // Verificar que la descarga se intenta (sin verificar la descarga real)
      cy.contains("Descargar PNG").should("be.visible");
    });
  });

  describe("Resumen por Servicio", () => {
    it("Debe cargar resumen de jornadas por servicio", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/service-summary`, {
        statusCode: 200,
        body: {
          rows: [
            { servicio: "Servicio A", jornadas: 10.5 },
            { servicio: "Servicio B", jornadas: 5.25 },
          ],
          total: 15.75,
        },
      }).as("getServiceSummary");

      cy.contains("Resumen por Servicios").click();

      cy.wait("@getServiceSummary");
      cy.contains("Servicio A").should("be.visible");
      cy.contains("Servicio B").should("be.visible");
      cy.contains("15.75").should("be.visible");
    });

    it("Debe mostrar servicios descontados", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/service-summary`, {
        statusCode: 200,
        body: {
          rows: [{ servicio: "Servicio A", jornadas: 10 }],
          total: 10,
          discountedRows: [{ servicio: "Servicio Descuento", jornadas: 2 }],
          discountedTotal: 2,
        },
      }).as("getServiceSummary");

      cy.contains("Resumen por Servicios").click();

      cy.wait("@getServiceSummary");
      cy.contains("Servicios Descontados").should("be.visible");
      cy.contains("Servicio Descuento").should("be.visible");
    });

    it("Debe mostrar gráfico de barras por servicio", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/service-summary`, {
        statusCode: 200,
        body: {
          rows: [
            { servicio: "Servicio A", jornadas: 10 },
            { servicio: "Servicio B", jornadas: 5 },
          ],
          total: 15,
        },
      }).as("getServiceSummary");

      cy.contains("Resumen por Servicios").click();

      cy.wait("@getServiceSummary");
      cy.contains("Comparativa de Jornadas por Servicio").should("be.visible");
    });
  });

  describe("Resumen por Puesto y Equal", () => {
    it("Debe cargar resumen por puesto y equal", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/equal-puesto-summary`, {
        statusCode: 200,
        body: {
          rows: [
            { puesto: "Conductor", equal: 100, jornadas: 10.5 },
            { puesto: "Operario", equal: 50, jornadas: 5.25 },
          ],
          total: 15.75,
        },
      }).as("getEqualPuestoSummary");

      cy.contains("Resumen Puesto/Equal").click();

      cy.wait("@getEqualPuestoSummary");
      cy.contains("Conductor").should("be.visible");
      cy.contains("Operario").should("be.visible");
    });

    it("Debe mostrar gráfico circular de distribución", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/equal-puesto-summary`, {
        statusCode: 200,
        body: {
          rows: [
            { puesto: "Conductor", equal: 100, jornadas: 10 },
            { puesto: "Operario", equal: 50, jornadas: 5 },
          ],
          total: 15,
        },
      }).as("getEqualPuestoSummary");

      cy.contains("Resumen Puesto/Equal").click();

      cy.wait("@getEqualPuestoSummary");
      cy.contains("Distribución de Jornadas").should("be.visible");
    });

    it("Debe mostrar puestos descontados", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/equal-puesto-summary`, {
        statusCode: 200,
        body: {
          rows: [{ puesto: "Conductor", equal: 100, jornadas: 10 }],
          total: 10,
          discountedRows: [{ puesto: "Limpieza", equal: 50, jornadas: 2 }],
          discountedTotal: 2,
        },
      }).as("getEqualPuestoSummary");

      cy.contains("Resumen Puesto/Equal").click();

      cy.wait("@getEqualPuestoSummary");
      cy.contains("Puestos Descontados").should("be.visible");
      cy.contains("Limpieza").should("be.visible");
    });
  });

  describe("Resumen de Estados y Partes", () => {
    it("Debe cargar resumen de estados con separación por partes", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/status-parts-summary`, {
        statusCode: 200,
        body: {
          rows: [
            {
              estado: "COMPLETO",
              noPartsCount: 50,
              noPartsPercent: 33.33,
              withPartsCount: 100,
              withPartsPercent: 66.67,
            },
            {
              estado: "INCOMPLETO",
              noPartsCount: 30,
              noPartsPercent: 30.0,
              withPartsCount: 70,
              withPartsPercent: 70.0,
            },
          ],
          footer: {
            estado: "TOTAL",
            noPartsCount: 80,
            noPartsPercent: 32.0,
            withPartsCount: 170,
            withPartsPercent: 68.0,
          },
        },
      }).as("getStatusPartsSummary");

      cy.contains("Resumen Estado/Partes").click();

      cy.wait("@getStatusPartsSummary");
      cy.contains("COMPLETO").should("be.visible");
      cy.contains("INCOMPLETO").should("be.visible");
    });

    it("Debe mostrar tabla con porcentajes correctos", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/status-parts-summary`, {
        statusCode: 200,
        body: {
          rows: [
            {
              estado: "COMPLETO",
              noPartsCount: 50,
              noPartsPercent: 50.0,
              withPartsCount: 50,
              withPartsPercent: 50.0,
            },
          ],
          footer: {
            estado: "TOTAL",
            noPartsCount: 50,
            noPartsPercent: 50.0,
            withPartsCount: 50,
            withPartsPercent: 50.0,
          },
        },
      }).as("getStatusPartsSummary");

      cy.contains("Resumen Estado/Partes").click();

      cy.wait("@getStatusPartsSummary");
      cy.contains("50.00").should("be.visible");
    });

    it("Debe mostrar gráfico de barras con estados", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/status-parts-summary`, {
        statusCode: 200,
        body: {
          rows: [
            {
              estado: "COMPLETO",
              noPartsCount: 50,
              noPartsPercent: 50.0,
              withPartsCount: 50,
              withPartsPercent: 50.0,
            },
          ],
          footer: {
            estado: "TOTAL",
            noPartsCount: 50,
            noPartsPercent: 50.0,
            withPartsCount: 50,
            withPartsPercent: 50.0,
          },
        },
      }).as("getStatusPartsSummary");

      cy.contains("Resumen Estado/Partes").click();

      cy.wait("@getStatusPartsSummary");
      cy.contains("Distribución de Estados").should("be.visible");
    });
  });

  describe("Exportación de datos", () => {
    it("Debe exportar Excel desde tabla de resultados", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}*`, {
        statusCode: 200,
        body: {
          data: [{ id: 1, trabajador: { nombre: "Juan" }, estado: "COMPLETO" }],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("getResults");

      cy.intercept("GET", `**/jornadas/${sessionId}/export*`, {
        statusCode: 200,
        body: new Blob(["excel content"], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        headers: {
          "content-disposition": 'attachment; filename="export.xlsx"',
        },
      }).as("export");

      cy.wait("@getResults");
      cy.get("button")
        .contains(/Exportar Excel/i)
        .click();
      cy.wait("@export");
    });

    it("Debe descargar PNG desde gráfico de tabla detallada", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}/table-detail`, {
        statusCode: 200,
        body: {
          columns: [{ key: "2024-01-01", label: "01 L" }],
          rows: [],
          footer: { servicio: "TOTAL", equipo: "", total: 10 },
        },
      }).as("getTableDetail");

      cy.contains("Tabla por Servicios/Equipos").click();

      cy.wait("@getTableDetail");
      cy.contains("Descargar PNG").should("be.visible");
      cy.contains("Descargar PNG").click();
    });
  });

  describe("Navegación entre vistas", () => {
    it("Debe navegar entre diferentes resúmenes", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      // Navegar a tabla detallada
      cy.get("a, button")
        .contains(/Tabla por Servicios\/Equipos/i)
        .click({ force: true });
      cy.contains(
        "No hay datos disponibles para generar la tabla detallada",
      ).should("be.visible");

      // Navegar a resumen por servicios
      cy.get("a, button")
        .contains(/Resumen por Servicios/i)
        .click({ force: true });
      cy.contains("No hay datos disponibles para generar el resumen").should(
        "be.visible",
      );
    });
  });
});
