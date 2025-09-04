// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Proporciona la ruta a tu aplicación Next.js.
  // Esta ruta es relativa al directorio desde donde se ejecuta `jest` (la raíz del monorepo).
  dir: "./apps/gestion",
});

// Agrega cualquier configuración personalizada que se pasará a Jest
const customJestConfig = {
  // Le dice a Jest dónde encontrar el archivo de setup.
  // `<rootDir>` se resuelve como la raíz del monorepo cuando se ejecuta desde allí.
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Mapea los alias de importación (como `@/*`) para que Jest los entienda.
  // Esto debe coincidir con la `baseUrl` y `paths` de tu `tsconfig.json`.
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // El entorno de prueba para una app de React/Next.js.
  testEnvironment: "jest-environment-jsdom",

  // Opcional pero recomendado: Especifica dónde buscar los tests para esta app.
  // Evita que Jest escanee accidentalmente tests de otras apps en el monorepo.
  testMatch: ["<rootDir>/src/**/*.spec.tsx"],
};

// createJestConfig se exporta de esta manera para asegurar que next/jest pueda cargar la configuración de Next.js, que es asíncrona
module.exports = createJestConfig(customJestConfig);
