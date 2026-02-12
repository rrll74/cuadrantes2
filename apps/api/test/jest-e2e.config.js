// Carga las variables de entorno desde .env.test.local ANTES de que Jest haga nada más.
// Usamos `require` para asegurar la carga síncrona al inicio.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');
// Construimos una ruta absoluta al fichero .env.test.local para evitar problemas con el CWD.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config({
  path: path.resolve(__dirname, '../.env.test.local'),
});

// Establecemos NODE_ENV=test si aún no está configurado
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pathsToModuleNameMapper } = require('ts-jest');
// Leemos el tsconfig.json de la API para obtener los mapeos de rutas.
// La ruta es relativa a este fichero de configuración.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const { compilerOptions } = require('../tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  moduleFileExtensions: ['js', 'json', 'ts'],
  // rootDir se establece en el directorio que contiene este fichero de config.
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  // Convierte los "paths" de tsconfig.json a un formato que Jest entiende.
  // Con rootDir='.', el prefijo '<rootDir>/../' navega desde 'apps/api/test'
  // hasta 'apps/api/', que es la base para resolver los alias como '@/...'.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/../',
  }),
  // Limita la ejecución a un solo worker para evitar condiciones de carrera en la BD de SQLite.
  maxWorkers: 1,
};
