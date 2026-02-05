/// <reference types="cypress" />

// Extiende la interfaz de Cypress para que TypeScript reconozca el nuevo comando `login`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Comando personalizado para iniciar sesión en la aplicación.
       * Utiliza cy.session para cachear la sesión y acelerar las pruebas.
       * @param username - El nombre de usuario. Por defecto, 'admin'.
       * @param password - La contraseña. Por defecto, 'adminpass'.
       * @example cy.login()
       * @example cy.login('testuser', 'userpass')
       */
      login(username?: string, password?: string): Chainable<void>;
      /**
       * Comando para navegar a una ruta protegida después de autenticarse.
       * Espera a que la página cargue correctamente.
       * @param path - La ruta a la que navegar (ej: /dashboard/jornadas)
       * @example cy.visitProtected('/dashboard/jornadas')
       */
      visitProtected(path: string): Chainable<void>;
    }
  }
}

// --- Implementación del comando `login` ---
Cypress.Commands.add(
  "login",
  (
    // Credenciales por defecto del e2e-setup.ts
    username = "testadmin",
    password = "adminpass",
  ) => {
    // cy.session() guarda y restaura cookies, localStorage, etc.
    // Esto evita tener que hacer login visualmente antes de cada test.
    cy.session([username, password], () => {
      cy.visit("/login");
      cy.get("#username").type(username);
      cy.get("#password").type(password);
      // Interceptar la llamada de login a la API
      cy.intercept("POST", "**/auth/login").as("loginRequest");
      cy.get('button[type="submit"]').click();
      // Esperar a que la llamada de login se complete
      cy.wait("@loginRequest", { timeout: 10000 });
      // Esperar a que la URL cambie a /dashboard
      cy.url({ timeout: 10000 }).should("include", "/dashboard");
      // Como una verificación extra, podemos comprobar que ya no estamos en la página de login
      cy.get("h1").contains("Iniciar Sesión").should("not.exist");
      // Esperar a que el Panel de Gestión se renderice (indicador de que el contexto está listo)
      cy.contains("Panel de Gestión", { timeout: 10000 }).should("be.visible");
    });
  },
);

// --- Implementación del comando `visitProtected` ---
Cypress.Commands.add("visitProtected", (path: string) => {
  cy.visit(path);
  // Esperar a que el contexto de autenticación se cargue
  // El Panel de Gestión es un indicador de que el usuario está autenticado
  cy.contains("Panel de Gestión", { timeout: 10000 }).should("be.visible");
  // Esperar a que la URL sea correcta (no esté redirigiendo al login)
  cy.url().should("include", path);
});

export {};
