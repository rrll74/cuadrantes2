// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pathsToModuleNameMapper } = require('ts-jest');
// Leemos el tsconfig.json de la API para obtener los mapeos de rutas.
// La ruta es relativa a este fichero de configuración.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const { compilerOptions } = require('../tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  // El rootDir es el directorio donde se encuentra este jest.config.js.
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  // Convierte los "paths" de tsconfig.json a un formato que Jest entiende.
  // El prefijo '<rootDir>/../' navega desde 'apps/api/test' hasta 'apps/api/'
  // para que las rutas se resuelvan correctamente desde la raíz de la API.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/../',
  }),
  globalSetup: '<rootDir>/e2e-setup.ts',
  globalTeardown: '<rootDir>/e2e-teardown.ts',
};
