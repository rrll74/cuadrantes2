describe("Login Page", () => {
  beforeEach(() => {
    // Visita la página de login antes de cada test
    cy.visit("/login");
  });

  it("should display the login form", () => {
    // Verifica que el título "Iniciar Sesión" esté presente
    cy.get("h1").contains("Iniciar Sesión").should("be.visible");

    // Verifica que los campos de usuario y contraseña existan
    // Usamos el `id` que es un selector más robusto
    cy.get("#username").should("be.visible");
    cy.get("#password").should("be.visible");

    // Verifica que el botón de acceso exista
    cy.get('button[type="submit"]').contains("Acceder").should("be.visible");
  });

  it("should show an error on failed login", () => {
    // Intercepta la llamada a la API y simula una respuesta de error 401
    cy.intercept("POST", "**/auth/login", {
      statusCode: 401,
      body: { message: "Unauthorized" },
    }).as("loginRequest");

    // Rellena el formulario con datos incorrectos
    cy.get("#username").type("wronguser");
    cy.get("#password").type("wrongpassword");

    // Envía el formulario
    cy.get('button[type="submit"]').click();

    // Verifica que se muestra el mensaje de error correcto
    cy.get('[role="alert"]').should(
      "contain.text",
      "Usuario o contraseña incorrectos"
    );
  });

  it("should allow a user to log in successfully and redirect to dashboard", () => {
    // Usamos nuestro nuevo y flamante comando personalizado.
    // ¡Mucho más limpio y reutilizable!
    // Ahora usamos las credenciales correctas que coinciden con e2e-setup.ts
    // O simplemente `cy.login()` ya que hemos actualizado los valores por defecto.
    cy.login("testadmin", "adminpass");

    // El comando `cy.login` ya verifica la redirección, pero podemos
    // añadir una verificación extra en el propio test si queremos.
    cy.url().should("include", "/dashboard");

    // Como una verificación extra, podemos comprobar que ya no estamos en la página de login
    cy.get("h1").contains("Iniciar Sesión").should("not.exist");
  });
});
