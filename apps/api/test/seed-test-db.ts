import 'dotenv/config'; // Carga variables de entorno si es necesario
import { DataSource } from 'typeorm';
import { getTestDbOptions, seedDatabase } from './e2e-setup';

/**
 * Este script se conecta a la base de datos de prueba, la sincroniza
 * (borrando y recreando el esquema) y la siembra con los datos de e2e-setup.
 */
async function run() {
  console.log('🌱 Iniciando el sembrado de la base de datos de prueba...');
  const testDbOptions = getTestDbOptions();
  const dataSource = new DataSource(testDbOptions);

  await dataSource.initialize();
  console.log('Conexión a la base de datos de prueba establecida.');

  await seedDatabase(dataSource);
  await dataSource.destroy();
}

run().catch(console.error);
