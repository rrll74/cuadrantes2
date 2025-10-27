// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Proporciona la ruta a tu aplicación Next.js.
  // Esta ruta es relativa al directorio desde donde se ejecuta `jest` (la raíz del monorepo).
  dir: "./apps/gestion",
});

// Agrega cualquier configuración personalizada que se pasará a Jest
const customJestConfig = {
  // Le dice a Jest dónde encontrar el archivo de setup.
  // La ruta es relativa a este fichero de configuración.
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Mapea los alias de importación (como `@/*`) para que Jest los entienda.
  // `<rootDir>` aquí se refiere a la raíz de `gestion` (donde está este jest.config.js).
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // El entorno de prueba para una app de React/Next.js.
  testEnvironment: "jest-environment-jsdom",
};

// createJestConfig se exporta de esta manera para asegurar que next/jest pueda cargar la configuración de Next.js, que es asíncrona
module.exports = createJestConfig(customJestConfig);
