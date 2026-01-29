describe("Gestión de Jornadas (Solo Lectura)", () => {
  beforeEach(() => {
    // Iniciamos sesión con el usuario que solo tiene permisos de lectura (configurado en e2e-setup.ts)
    cy.login("testuser", "userpass");
    cy.visit("/dashboard/jornadas");
  });

  it("Un usuario sin permisos de escritura ve el listado pero NO el formulario de subida", () => {
    // Interceptamos la petición para asegurar que la página carga correctamente
    cy.intercept("GET", "**/jornadas", {
      statusCode: 200,
      body: [],
    }).as("getSessionsEmpty");

    cy.wait("@getSessionsEmpty");

    // 1. Verificar que tiene acceso a la página (Título principal visible)
    cy.get("h1").contains("Gestión de Jornadas").should("be.visible");

    // 2. Verificar que ve la sección del listado
    cy.contains("Historial de Cargas").should("be.visible");

    // 3. Verificar que NO ve el formulario de subida
    // Buscamos el título específico del componente UploadJornadasForm
    cy.contains("Carga de Jornadas y Fichajes").should("not.exist");
    // Buscamos inputs de tipo file
    cy.get('input[type="file"]').should("not.exist");
    // Buscamos el botón de procesar
    cy.contains("button", "Procesar Archivos").should("not.exist");
  });

  it("No muestra botones de eliminación en el listado de sesiones", () => {
    // Simulamos que hay datos para verificar las acciones por fila
    cy.intercept("GET", "**/jornadas", (req) => {
      // Evitamos interceptar la carga de la página (documento HTML) para que no muestre el JSON en pantalla
      if (
        req.headers.accept &&
        String(req.headers.accept).includes("text/html")
      ) {
        req.continue();
      } else {
        req.reply({
          statusCode: 200,
          body: [
            {
              id: 999,
              createdAt: new Date().toISOString(),
              totalRutas: 15,
              totalResultados: 15,
            },
          ],
        });
      }
    }).as("getSessionsWithData");

    // Recargamos para que tome el nuevo intercept
    cy.reload();
    cy.wait("@getSessionsWithData");

    // Verificamos la fila
    cy.contains("tr", "#999")
      .scrollIntoView()
      .within(() => {
        // Debe ver el botón de "Ver resultados" (ojo)
        cy.get('a[aria-label="Ver resultados"]').should("be.visible");

        // NO debe ver el botón de "Eliminar sesión" (basura)
        cy.get('button[aria-label="Eliminar sesión"]').should("not.exist");
      });
  });
});
