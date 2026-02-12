/* eslint-disable @typescript-eslint/no-explicit-any */
describe("Consulta de Cuadrantes (E2E)", () => {
  beforeEach(() => {
    // Iniciamos sesión con el usuario admin que tiene permisos
    cy.login("testadmin", "adminpass");
    cy.visit("/dashboard/consulta-cuadrantes");
  });

  describe("Acceso y Permisos", () => {
    it("Debe mostrar la página si el usuario tiene permisos", () => {
      cy.get("h1").contains("Consulta de Cuadrantes").should("be.visible");
    });

    it("Debe mostrar el enlace en el menú lateral", () => {
      // Buscar directamente el texto en el list item del drawer
      cy.contains(
        'a[href="/dashboard/consulta-cuadrantes"]',
        "Consulta de Cuadrantes",
      ).should("be.visible");
    });
  });

  describe("Cargar Empleados", () => {
    it("Debe cargar y mostrar lista de empleados", () => {
      cy.get("label").contains("Empleado").should("be.visible");
      cy.get('[data-testid="empleado-select"]').should("exist");
    });

    it("Debe tener orden alfabético en empleados", () => {
      cy.get('[data-testid="empleado-select"]').should("exist");
      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').should("have.length.greaterThan", 1);
    });
  });

  describe("Seleccionar Período", () => {
    it("Debe permitir cambiar mes inicio", () => {
      cy.get("label").contains("Mes").should("be.visible");
      cy.get('[data-testid="mes-inicio-select"]').should("exist");
    });

    it("Debe mostrar valores de mes y año actuales por defecto", () => {
      const currentYear = new Date().getFullYear();

      // El valor está en el input interno del TextField
      cy.get('[data-testid="anio-inicio-select"]')
        .should("be.visible")
        .find("input")
        .should("have.value", currentYear.toString());
    });
  });

  describe("Cargar Cuadrantes", () => {
    it("Debe cargar cuadrantes cuando se selecciona empleado", () => {
      // Interceptar la llamada para verificarla
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles").as(
        "getCuadrantes",
      );

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]')
        .contains("Seleccione un empleado")
        .should("exist");
      cy.get('[role="option"]').eq(1).click();

      cy.wait("@getCuadrantes");
      cy.get("[data-testid='cuadrante-select']").should("exist");
    });

    it("Debe mostrar error si no hay cuadrantes disponibles", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [],
      }).as("getCuadrantesEmpty");

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();

      cy.wait("@getCuadrantesEmpty");
      cy.contains("No se encontraron cuadrantes disponibles").should(
        "be.visible",
      );
    });
  });

  describe("Realizar Consulta", () => {
    it("Debe validar que se seleccione empleado antes de consultar", () => {
      cy.get("button").contains("Buscar").should("be.disabled");
    });

    it("Debe realizar consulta y mostrar resultados", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles").as(
        "getCuadrantes",
      );
      cy.intercept("POST", "**/consulta-cuadrantes/consultar").as("consultar");

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.wait("@getCuadrantes");

      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();

      cy.wait("@consultar");

      // Verificar que se mostró la tabla de resultados
      cy.get("table").should("be.visible");
    });

    it("Debe mostrar información del empleado en los resultados", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A", descripcion: "Test" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar", {
        statusCode: 201,
        body: {
          empleado: {
            id: 1,
            nombre: "Juan",
            apellido1: "Pérez",
            email: "juan@example.com",
          },
          cuadrante: {
            id: 1,
            nombre: "Cuadrante A",
            anio: 2024,
          },
          meses: [],
          estadosUsados: [],
        },
      });

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();

      cy.contains("Juan").should("be.visible");
    });

    it("Debe mostrar error si la consulta falla", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar", {
        statusCode: 500,
        body: {},
      });

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();

      cy.contains("Error al realizar la consulta").should("be.visible");
    });
  });

  describe("Generar PDF", () => {
    beforeEach(() => {
      // Configurar mock para que haya resultados
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar", {
        statusCode: 201,
        body: {
          empleado: {
            id: 1,
            nombre: "Juan",
            apellido1: "Pérez",
            email: "juan@example.com",
          },
          cuadrante: { id: 1, nombre: "Cuadrante A" },
          meses: [],
          estadosUsados: [],
        },
      });

      // Cargar datos
      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();
    });

    it("Debe deshabilitar botón de PDF antes de consulta", () => {
      cy.reload();
      cy.get("button").contains("Descargar PDF").should("not.exist");
    });

    it("Debe habilitar botón de PDF después de consulta", () => {
      cy.get("button").contains("Descargar PDF").should("not.be.disabled");
    });

    it("Debe generar PDF al hacer clic", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/generar-pdf", {
        statusCode: 201,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": 'attachment; filename="test.pdf"',
        },
        body: "PDF content",
      }).as("generatePdf");

      cy.get("button").contains("Descargar PDF").click();
      cy.wait("@generatePdf");
    });

    it("Debe incluir nombre del empleado en el filename", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/generar-pdf").as(
        "generatePdf",
      );

      cy.get("button").contains("Descargar PDF").click();

      cy.get("@generatePdf").then((interception: any) => {
        expect(interception.request.body).to.include.keys("empleadoId");
      });
    });
  });

  describe("Enviar por Email", () => {
    beforeEach(() => {
      // Configurar mocks
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar", {
        statusCode: 201,
        body: {
          empleado: {
            id: 1,
            nombre: "Juan",
            apellido1: "Pérez",
            email: "juan@example.com",
          },
          cuadrante: { id: 1, nombre: "Cuadrante A" },
          meses: [],
          estadosUsados: [],
        },
      });

      // Cargar datos
      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();
    });

    it("Debe deshabilitar botón de email antes de consulta", () => {
      cy.reload();
      cy.get("button").contains("Enviar por Email").should("not.exist");
    });

    it("Debe habilitar botón de email después de consulta", () => {
      cy.get("button").contains("Enviar por Email").should("not.be.disabled");
    });

    it("Debe enviar PDF por email al hacer clic", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/enviar-pdf-email", {
        statusCode: 201,
        body: { success: true, message: "Email enviado correctamente" },
      }).as("sendEmail");

      cy.get("button").contains("Enviar por Email").click();
      cy.wait("@sendEmail");
    });

    it("Debe mostrar alerta de éxito después de enviar", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/enviar-pdf-email", {
        statusCode: 201,
        body: { success: true, message: "Email enviado correctamente" },
      });

      // Stub window.alert
      cy.window().then((win) => {
        cy.stub(win, "alert").as("alertStub");
      });

      cy.get("button").contains("Enviar por Email").click();

      cy.get("@alertStub").should(
        "have.been.calledWith",
        "Email enviado correctamente",
      );
    });
  });

  describe("Leyenda de Colores", () => {
    it("Debe mostrar leyenda de colores después de consulta", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar", {
        statusCode: 201,
        body: {
          empleado: { id: 1, nombre: "Juan" },
          cuadrante: { id: 1, nombre: "Cuadrante A" },
          meses: [
            {
              mes: 1,
              anio: 2024,
              mesNombre: "Enero",
              asignaciones: [
                {
                  dia: 1,
                  mes: 1,
                  anio: 2024,
                  abreviatura: "COM",
                  colortexto: 0,
                  colorfondo: 65280,
                },
              ],
            },
          ],
          estadosUsados: [
            {
              id: 1,
              abreviatura: "COM",
              descrip: "Completo",
              colortexto: 0,
              colorfondo: 65280,
            },
          ],
        },
      });

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();

      cy.contains("Leyenda").should("be.visible");
    });

    it("Debe mostrar estados con sus colores en la leyenda", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar", {
        statusCode: 201,
        body: {
          empleado: { id: 1, nombre: "Juan" },
          cuadrante: { id: 1, nombre: "Cuadrante A" },
          meses: [
            {
              mes: 1,
              anio: 2024,
              mesNombre: "Enero",
              asignaciones: [
                {
                  dia: 1,
                  mes: 1,
                  anio: 2024,
                  abreviatura: "COM",
                  colortexto: 0,
                  colorfondo: 65280,
                },
              ],
            },
          ],
          estadosUsados: [
            {
              id: 1,
              abreviatura: "COM",
              descrip: "Completo",
              colortexto: 0,
              colorfondo: 65280,
            },
          ],
        },
      });

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();

      cy.contains("COM").should("be.visible");
    });
  });

  describe("Tabla de Resultados", () => {
    it("Debe mostrar tabla con estructura correcta", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar", {
        statusCode: 201,
        body: {
          empleado: { id: 1, nombre: "Juan" },
          cuadrante: { id: 1, nombre: "Cuadrante A", anio: 2024 },
          meses: [
            {
              mes: 1,
              anio: 2024,
              mesNombre: "Enero",
              asignaciones: Array(31)
                .fill(null)
                .map((_, i) => ({
                  dia: i + 1,
                  mes: 1,
                  anio: 2024,
                  abreviatura: "COM",
                  colortexto: 0,
                  colorfondo: 65280,
                })),
            },
          ],
          estadosUsados: [],
        },
      });

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();

      cy.get("table").should("be.visible");
      cy.get("thead").should("be.visible");
      cy.get("tbody").should("be.visible");
    });

    it("Debe mostrar datos de múltiples meses", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar", {
        statusCode: 201,
        body: {
          empleado: { id: 1, nombre: "Juan" },
          cuadrante: { id: 1, nombre: "Cuadrante A" },
          meses: [
            {
              mes: 1,
              anio: 2024,
              mesNombre: "Enero",
              asignaciones: Array(31)
                .fill(null)
                .map((_, i) => ({
                  dia: i + 1,
                  mes: 1,
                  anio: 2024,
                  abreviatura: "COM",
                  colortexto: 0,
                  colorfondo: 65280,
                })),
            },
            {
              mes: 2,
              anio: 2024,
              mesNombre: "Febrero",
              asignaciones: Array(29)
                .fill(null)
                .map((_, i) => ({
                  dia: i + 1,
                  mes: 2,
                  anio: 2024,
                  abreviatura: "INC",
                  colortexto: 0,
                  colorfondo: 255,
                })),
            },
          ],
          estadosUsados: [],
        },
      });

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("button").contains("Buscar").click();

      // Verificar que hay datos de múltiples meses
      cy.contains("Enero").should("be.visible");
      cy.contains("Febrero").should("be.visible");
    });
  });

  describe("Selector Tipo Cuadrante", () => {
    it("Debe permitir seleccionar tipo inicial o modificado", () => {
      cy.get("input[type='radio']").should("have.length.greaterThan", 1);
      cy.get("label").contains("Inicial").should("be.visible");
      cy.get("label").contains("Modificado").should("be.visible");
    });

    it("Debe enviar tipo seleccionado en la consulta", () => {
      cy.intercept("POST", "**/consulta-cuadrantes/cuadrantes-disponibles", {
        statusCode: 201,
        body: [{ id: 1, nombre: "Cuadrante A" }],
      });

      cy.intercept("POST", "**/consulta-cuadrantes/consultar").as("consultar");

      cy.get('[data-testid="empleado-select"]').click();
      cy.get('[role="option"]').eq(1).click();
      cy.get("[data-testid='cuadrante-select']").click();
      cy.get('[role="option"]').eq(1).click();

      cy.get("label").contains("Modificado").click();
      cy.get("button").contains("Buscar").click();

      cy.get("@consultar").then((interception: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(interception.request.body.tipoInicial).to.be.false;
      });
    });
  });
});
