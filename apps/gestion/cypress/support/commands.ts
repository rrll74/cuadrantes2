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
    }
  }
}

// --- Implementación del comando `login` ---
Cypress.Commands.add(
  "login",
  (
    // Credenciales por defecto del e2e-setup.ts
    username = "testadmin",
    password = "adminpass"
  ) => {
    // cy.session() guarda y restaura cookies, localStorage, etc.
    // Esto evita tener que hacer login visualmente antes de cada test.
    cy.session([username, password], () => {
      cy.visit("/login");
      cy.get("#username").type(username);
      cy.get("#password").type(password);
      cy.get('button[type="submit"]').click();
      cy.url().should("include", "/dashboard"); // Verificamos que el login fue exitoso
    });
  }
);
