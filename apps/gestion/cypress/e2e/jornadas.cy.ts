describe("Gestión de Jornadas", () => {
  beforeEach(() => {
    // Iniciamos sesión
    // Asumimos que el comando cy.login ya está configurado (como se ve en login.cy.ts)
    cy.login("testadmin", "adminpass");
  });

  it("Debe permitir subir archivos, ver la sesión en la lista y eliminarla", () => {
    // 1. Interceptar la carga inicial (lista vacía)
    cy.intercept("GET", "**/jornadas", {
      statusCode: 200,
      body: [],
    }).as("getSessionsInitial");

    // Visitamos tras definir el intercept para capturar la petición inicial
    // Usando visitProtected para asegurar que la página se carga correctamente
    cy.visitProtected("/dashboard/jornadas");

    // Esperar a que la página cargue y haga la primera petición
    cy.wait("@getSessionsInitial");
    cy.contains("No hay sesiones registradas.").should("be.visible");

    // 2. Preparar intercept para la subida de archivos
    // Simulamos una respuesta exitosa del backend
    cy.intercept("POST", "**/jornadas/upload", {
      delay: 1000, // Añadimos retardo para verificar la barra de progreso
      statusCode: 201,
      body: {
        success: true,
        sessionId: 101,
        stats: { totalRutas: 10, procesados: 10, conflictos: 0 },
      },
    }).as("uploadFiles");

    // 3. Preparar intercept para la lista actualizada
    // Definimos este intercept DESPUÉS para que tenga prioridad sobre el inicial
    // cuando React Query haga el refetch tras la subida
    cy.intercept("GET", "**/jornadas", {
      statusCode: 200,
      body: [
        {
          id: 101,
          createdAt: new Date().toISOString(),
          totalRutas: 10,
          totalResultados: 10,
        },
      ],
    }).as("getSessionsUpdated");

    // --- ACCIÓN: SUBIR ARCHIVOS ---
    // Creamos un archivo dummy en memoria para simular los Excel
    const dummyFile = {
      contents: Cypress.Buffer.from("dummy content"),
      fileName: "test.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    // Simulamos la selección de archivos en los inputs de cada dropzone
    cy.contains("label", "Rutas Titulares (Excel)")
      .parent()
      .find('input[type="file"]')
      .selectFile(dummyFile, { force: true });
    cy.contains("label", "Rutas Auxiliares (Excel)")
      .parent()
      .find('input[type="file"]')
      .selectFile(dummyFile, { force: true });
    cy.contains("label", "Listado Trabajadores (Excel)")
      .parent()
      .find('input[type="file"]')
      .selectFile(dummyFile, { force: true });
    cy.contains("label", "Fichajes (Excel)")
      .parent()
      .find('input[type="file"]')
      .selectFile(dummyFile, { force: true });

    // Enviamos el formulario
    // Buscamos un botón de tipo submit genérico
    cy.get('button[type="submit"]').click();

    // --- VERIFICACIÓN: BARRA DE PROGRESO ---
    // Verificamos que aparece el indicador de carga y el botón cambia de estado
    cy.contains("Subiendo y procesando...").should("be.visible");
    cy.get('button[type="submit"]').should("contain", "Procesando...");

    // Esperamos a que la petición de subida se complete
    cy.wait("@uploadFiles");

    // Verificamos que el indicador desaparece tras la carga
    cy.contains("Subiendo y procesando...").should("not.exist");

    // --- VERIFICACIÓN: LISTA ACTUALIZADA ---
    // Esperamos a que la lista se actualice con los nuevos datos
    cy.wait("@getSessionsUpdated");

    // Verificamos que la fila con ID #101 existe y tiene los botones correctos
    cy.contains("tr", "#101").should("be.visible");
    cy.contains("tr", "#101").within(() => {
      cy.contains("10").should("be.visible"); // Verifica datos de la fila
      cy.get('a[aria-label="Ver resultados"]').should("be.visible");
      cy.get('button[aria-label="Eliminar sesión"]').should("be.visible");
    });

    // 4. Preparar intercept para el borrado
    cy.intercept("DELETE", "**/jornadas/101", {
      statusCode: 200,
      body: { success: true },
    }).as("deleteSession");

    // 5. Preparar intercept para la lista final (vacía de nuevo)
    cy.intercept("GET", "**/jornadas", {
      statusCode: 200,
      body: [],
    }).as("getSessionsFinal");

    // --- ACCIÓN: ELIMINAR SESIÓN ---
    // Hacemos clic en el botón de eliminar de la fila #101
    cy.contains("tr", "#101")
      .find('button[aria-label="Eliminar sesión"]')
      .click();

    // Confirmamos en el diálogo personalizado
    cy.contains("Eliminar Sesión").should("be.visible");
    cy.contains("button", "Eliminar").click();

    // Esperamos la llamada a DELETE
    cy.wait("@deleteSession");

    // Esperamos el refetch de la lista
    cy.wait("@getSessionsFinal");

    // Verificamos que la sesión ha desaparecido de la UI
    cy.contains("tr", "#101").should("not.exist");
    cy.contains("No hay sesiones registradas.").should("be.visible");
  });
});
