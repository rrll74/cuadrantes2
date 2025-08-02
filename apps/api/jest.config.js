// Leemos el tsconfig.json para obtener los mapeos de rutas.
// Asegúrate de que la ruta al tsconfig.json sea la correcta.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const { compilerOptions } = require('./tsconfig.json');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pathsToModuleNameMapper } = require('ts-jest');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  // El rootDir debe ser el directorio donde se encuentra este jest.config.js.
  // Jest lo usará como base para todas las rutas.
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage', // Directorio para los reportes de cobertura
  testEnvironment: 'node',

  // ¡Esta es la parte importante!
  // Convierte los "paths" de tsconfig.json a un formato que Jest entiende.
  // El prefijo '<rootDir>/' le dice a Jest que las rutas son relativas al directorio raíz.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
};
