// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Proporciona la ruta a tu aplicación Next.js para cargar next.config.js y .env en el entorno de prueba
  dir: "./apps/gestion",
});

// Añade cualquier configuración personalizada de Jest que desees
const customJestConfig = {
  // Establece el directorio raíz del proyecto para Jest
  rootDir: ".",
  // Añade un setup global para los tests
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  // Si estás usando alias de tsconfig.json, configúralos aquí también
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testEnvironment: "jest-environment-jsdom",
};

module.exports = createJestConfig(customJestConfig);
