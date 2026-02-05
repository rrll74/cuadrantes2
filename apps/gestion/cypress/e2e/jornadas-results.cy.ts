describe("Resultados de Jornada (Paginación y Filtros)", () => {
  const sessionId = 123;

  beforeEach(() => {
    // Asumimos que el comando cy.login ya está configurado
    cy.login("testadmin", "adminpass");
  });

  it("Debe navegar por las páginas y filtrar resultados", () => {
    // --- MOCK DATA ---
    const mockStats = {
      total: 15,
      completo: 10,
      incompleto: 5,
      sinPresencia: 0,
      revisar: 0,
    };

    const mockPage1 = {
      data: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        ruta: {
          fechaGeneral: "2023-10-27",
          servicio: `Servicio ${i + 1}`,
          equipo: "Equipo A",
          inicio: "2023-10-27T08:00:00Z",
          fin: "2023-10-27T16:00:00Z",
          workerId: i + 1,
        },
        trabajador: {
          excelId: i + 1,
          nombre: `Trabajador ${i + 1}`,
          apellido1: "Apellido",
        },
        estado: "COMPLETO",
      })),
      meta: { totalPages: 2, page: 1, limit: 10, total: 15 },
      stats: mockStats,
    };

    const mockPage2 = {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: i + 11,
        ruta: {
          fechaGeneral: "2023-10-27",
          servicio: `Servicio ${i + 11}`,
          equipo: "Equipo B",
          inicio: "2023-10-27T08:00:00Z",
          fin: "2023-10-27T16:00:00Z",
          workerId: i + 11,
        },
        trabajador: {
          excelId: i + 11,
          nombre: `Trabajador ${i + 11}`,
          apellido1: "Apellido",
        },
        estado: "INCOMPLETO",
      })),
      meta: { totalPages: 2, page: 2, limit: 10, total: 15 },
      stats: mockStats,
    };

    const mockSearch = {
      data: [
        {
          id: 99,
          ruta: {
            fechaGeneral: "2023-10-27",
            servicio: "Servicio Especial",
            equipo: "Equipo C",
            inicio: "2023-10-27T08:00:00Z",
            fin: "2023-10-27T16:00:00Z",
            workerId: 99,
          },
          trabajador: {
            excelId: 99,
            nombre: "Juan",
            apellido1: "Pérez",
          },
          estado: "COMPLETO",
        },
      ],
      meta: { totalPages: 1, page: 1, limit: 10, total: 1 },
      stats: { ...mockStats, total: 1 },
    };

    // --- INTERCEPTS ---

    // Carga inicial (Página 1, sin búsqueda)
    cy.intercept("GET", `**/jornadas/${sessionId}?page=1&limit=10&search=*`, {
      statusCode: 200,
      body: mockPage1,
    }).as("getPage1");

    // Página 2
    cy.intercept("GET", `**/jornadas/${sessionId}?page=2&limit=10&search=*`, {
      statusCode: 200,
      body: mockPage2,
    }).as("getPage2");

    // Búsqueda
    cy.intercept(
      "GET",
      `**/jornadas/${sessionId}?page=1&limit=10&search=Juan*`,
      { statusCode: 200, body: mockSearch },
    ).as("getSearch");

    // --- TEST ---

    // 1. Visitar la página de resultados
    cy.visit(`/dashboard/jornadas/${sessionId}`);

    // 2. Verificar carga inicial (Página 1)
    cy.wait("@getPage1");
    cy.contains("Trabajador 1").should("be.visible");
    cy.contains("Trabajador 10").should("be.visible");
    // Verificar texto de paginación (buscando dentro del componente Pagination)
    cy.contains("Página 1 de 2").should("be.visible");

    // 3. Probar Paginación: Ir a Siguiente
    // Buscamos el botón "Siguiente" dentro de la navegación de escritorio
    cy.get('nav[aria-label="Pagination"] button').last().click();

    cy.wait("@getPage2");
    cy.contains("Trabajador 11").should("be.visible");
    cy.contains("Página 2 de 2").should("be.visible");
    // Verificar que los datos de la página 1 ya no están
    cy.contains("Trabajador 3").should("not.exist");

    // 4. Probar Paginación: Ir a Anterior
    cy.get('nav[aria-label="Pagination"] button').first().click();
    cy.wait("@getPage1");
    cy.contains("Trabajador 1").should("be.visible");

    // 5. Probar Filtrado/Búsqueda
    cy.get('input[placeholder="Nombre, apellido, equipo..."]').type("Juan");

    // Esperar al debounce y la llamada a la API
    cy.wait("@getSearch");

    // Verificar resultados filtrados
    cy.contains("Juan Pérez").should("be.visible");
    cy.contains("Trabajador 1").should("not.exist");

    // Verificar que la paginación se reseteó a 1 de 1
    cy.contains("Página 1 de 1").should("be.visible");
  });
});
