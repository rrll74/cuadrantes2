const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Proporciona la ruta a tu aplicación Next.js para cargar next.config.js y archivos .env
  dir: "./apps/gestion",
});

// Configuración personalizada de Jest
const customJestConfig = {
  displayName: "gestion",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    // Manejo de alias de módulos (coincidiendo con tsconfig.json)
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testRegex: ".*\\.spec\\.tsx?$",
  collectCoverageFrom: ["src/**/*.{ts,tsx}"],
  coverageDirectory: "./coverage",
};

// createJestConfig se exporta de esta manera para asegurar que next/jest pueda cargar la configuración de Next.js
module.exports = createJestConfig(customJestConfig);
