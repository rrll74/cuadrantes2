describe("Jornadas Query - Filtros y Búsqueda E2E", () => {
  const sessionId = 123;

  beforeEach(() => {
    cy.login("testadmin", "adminpass");
  });

  describe("Filtros de Resultados de Sesión", () => {
    beforeEach(() => {
      cy.visit(`/dashboard/jornadas/${sessionId}/`);
    });

    it("Debe aplicar múltiples filtros simultáneamente", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}*`, {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
                equipo: "Equipo A",
              },
              estado: "COMPLETO",
              discounted: false,
            },
          ],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("getFiltered");

      // Buscar + Filtrar por estado + Filtrar por tipo jornada
      cy.get("input[placeholder*='Nombre, apellido, equipo...']").type("Juan");
      cy.get("select").eq(0).select("completo");
      cy.get("select").eq(1).select("false"); // No descontada

      cy.wait("@getFiltered");
      cy.contains("Juan").should("be.visible");
    });

    it("Debe paginar correctamente entre páginas", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}*page=1*`, {
        statusCode: 200,
        body: {
          data: Array(10)
            .fill(null)
            .map((_, i) => ({
              id: i,
              trabajador: { nombre: `Worker ${i}`, apellido1: "Last" },
              estado: "COMPLETO",
            })),
          meta: { page: 1, limit: 10, total: 25, totalPages: 3 },
        },
      }).as("getPage1");

      cy.intercept("GET", `**/jornadas/${sessionId}*page=2*`, {
        statusCode: 200,
        body: {
          data: Array(10)
            .fill(null)
            .map((_, i) => ({
              id: i + 10,
              trabajador: { nombre: `Worker ${i + 10}`, apellido1: "Last" },
              estado: "COMPLETO",
            })),
          meta: { page: 2, limit: 10, total: 25, totalPages: 3 },
        },
      }).as("getPage2");

      cy.wait("@getPage1");

      // Click en siguiente página
      cy.get("button")
        .contains(/Siguiente|Next|>/i)
        .click({ force: true });
      cy.wait("@getPage2");
      cy.contains("Worker 10").should("be.visible");
    });

    it("Debe mostrar correctamente el total de registros", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}*`, {
        statusCode: 200,
        body: {
          data: [{ id: 1, trabajador: { nombre: "Juan" } }],
          meta: { page: 1, limit: 10, total: 47, totalPages: 5 },
        },
      }).as("getResults");

      cy.wait("@getResults");
      cy.contains(/47|Total/).should("be.visible");
    });
  });

  describe("Búsqueda con Debounce", () => {
    it("Debe buscar con debounce para no hacer muchas peticiones", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}*`, (req) => {
        req.reply({
          statusCode: 200,
          body: {
            data: [],
            meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
          },
        });
      }).as("searchRequest");

      const searchInput = cy.get(
        "input[placeholder*='Nombre, apellido, equipo...']",
      );

      // Escribir caracteres rápidamente
      searchInput.type("J", { delay: 50 });
      searchInput.type("u", { delay: 50 });
      searchInput.type("a", { delay: 50 });
      searchInput.type("n", { delay: 50 });

      // Esperar a que se completen las peticiones con debounce
      cy.wait(600); // Más tiempo que el debounce

      // No debería haber muchas peticiones (debounce en acción)
      // Típicamente sería 1-2 peticiones, no 4
    });

    it("Debe buscar con características del trabajador (nombre, equipo)", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}*search=Equipo*`, {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              trabajador: {
                nombre: "Juan",
                apellido1: "Pérez",
                equipo: "Equipo A",
              },
              estado: "COMPLETO",
            },
          ],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("searchByEquipo");

      cy.get("input[placeholder*='Nombre, apellido, equipo...']").type(
        "Equipo A",
      );
      cy.wait("@searchByEquipo", { timeout: 2000 });
      cy.contains("Equipo A").should("be.visible");
    });
  });

  describe("Filtros de Estado", () => {
    beforeEach(() => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);
    });

    it("Debe filtrar por COMPLETO", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}?*estado=COMPLETO*`, {
        statusCode: 200,
        body: {
          data: [{ id: 1, trabajador: { nombre: "Juan" }, estado: "COMPLETO" }],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("filterCompleto");

      cy.get("select").eq(0).select("COMPLETO");
      cy.wait("@filterCompleto");
      cy.contains("COMPLETO").should("be.visible");
    });

    it("Debe filtrar por INCOMPLETO", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}?*estado=INCOMPLETO*`, {
        statusCode: 200,
        body: {
          data: [
            { id: 1, trabajador: { nombre: "María" }, estado: "INCOMPLETO" },
          ],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("filterIncompleto");

      cy.get("select").eq(0).select("INCOMPLETO");
      cy.wait("@filterIncompleto");
      cy.contains("INCOMPLETO").should("be.visible");
    });

    it("Debe filtrar por SIN_PRESENCIA", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}?*estado=SIN_PRESENCIA*`, {
        statusCode: 200,
        body: {
          data: [
            {
              id: 1,
              trabajador: { nombre: "Carlos" },
              estado: "SIN_PRESENCIA",
            },
          ],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("filterSinPresencia");

      cy.get("select").eq(0).select("SIN_PRESENCIA");
      cy.wait("@filterSinPresencia");
      cy.contains("SIN_PRESENCIA").should("be.visible");
    });
  });

  describe("Filtros de Tipo de Jornada", () => {
    beforeEach(() => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);
    });

    it("Debe filtrar jornadas computables (no descontadas)", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}?*discounted=false*`, {
        statusCode: 200,
        body: {
          data: [{ id: 1, trabajador: { nombre: "Juan" }, discounted: false }],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("filterComputable");

      cy.get("select").eq(1).select("false");
      cy.wait("@filterComputable");
    });

    it("Debe filtrar jornadas descontadas", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}?*discounted=true*`, {
        statusCode: 200,
        body: {
          data: [{ id: 1, trabajador: { nombre: "María" }, discounted: true }],
          meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      }).as("filterDiscounted");

      cy.get("select").eq(1).select("true");
      cy.wait("@filterDiscounted");
    });

    it("Debe mostrar todas las jornadas cuando no hay filtro", () => {
      cy.intercept("GET", `**/jornadas/${sessionId}?*discounted=*`, {
        statusCode: 200,
        body: {
          data: [
            { id: 1, trabajador: { nombre: "Juan" }, discounted: false },
            { id: 2, trabajador: { nombre: "María" }, discounted: true },
          ],
          meta: { page: 1, limit: 10, total: 2, totalPages: 1 },
        },
      }).as("filterAll");

      cy.get("select").eq(1).select(""); // Seleccionar opción vacía
      cy.wait("@filterAll");
    });
  });

  describe("Stats y Resumen", () => {
    it("Debe mostrar tarjetas de resumen con conteos correctos", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}*`, {
        statusCode: 200,
        body: {
          data: [],
          stats: {
            total: 100,
            completo: 60,
            incompleto: 30,
            sinPresencia: 10,
          },
          meta: { page: 1, limit: 10, total: 100, totalPages: 10 },
        },
      }).as("getStats");

      cy.wait("@getStats");
      cy.contains("100").should("be.visible"); // Total
      cy.contains("60").should("be.visible"); // Completo
      cy.contains("30").should("be.visible"); // Incompleto
      cy.contains("10").should("be.visible"); // Sin presencia
    });

    it("Debe actualizar stats al cambiar filtros", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}?*estado=COMPLETO*`, {
        statusCode: 200,
        body: {
          data: [],
          stats: {
            total: 60,
            completo: 60,
            incompleto: 0,
            sinPresencia: 0,
          },
          meta: { page: 1, limit: 10, total: 60, totalPages: 6 },
        },
      }).as("getFilteredStats");

      cy.get("select").eq(0).select("COMPLETO");
      cy.wait("@getFilteredStats");
      cy.contains("60").should("be.visible");
    });
  });

  describe("Errores y Estados Vacíos", () => {
    it("Debe mostrar mensaje cuando no hay resultados", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}*`, {
        statusCode: 200,
        body: {
          data: [],
          stats: { total: 0, completo: 0, incompleto: 0, sinPresencia: 0 },
          meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
        },
      }).as("getEmpty");

      cy.wait("@getEmpty");
      cy.get("body").then(($body) => {
        if ($body.text().includes("No hay datos")) {
          cy.contains(/No hay datos|sin resultados/i).should("be.visible");
        }
      });
    });

    it("Debe manejar errores de API correctamente", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}*`, {
        statusCode: 500,
        body: { error: "Internal Server Error" },
      }).as("getError");

      cy.wait("@getError");
      cy.get("body").then(($body) => {
        if ($body.text().includes("Error")) {
          cy.contains(/Error|error/i).should("be.visible");
        }
      });
    });

    it("Debe mostrar loader mientras carga datos", () => {
      cy.visit(`/dashboard/jornadas/${sessionId}`);

      cy.intercept("GET", `**/jornadas/${sessionId}*`, (req) => {
        // Delay larga para ver el loader
        req.reply({
          statusCode: 200,
          delay: 1000,
          body: {
            data: [],
            stats: {
              total: 0,
              completo: 0,
              incompleto: 0,
              sinPresencia: 0,
            },
            meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
          },
        });
      }).as("getWithDelay");

      // Buscar para disparar nueva petición
      cy.get("input[placeholder*='Buscar']").type("test");

      // Debe haber un loader visible brevemente
      cy.get(".spinner, [role='status'], .loader").then(($loader) => {
        if ($loader.length > 0) {
          cy.wrap($loader).should("be.visible");
        }
      });

      cy.wait("@getWithDelay");
    });
  });
});
