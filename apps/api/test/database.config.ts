import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { getTestDbOptions } from './e2e-setup';

/**
 * Determina la configuración de la base de datos basada en el entorno.
 */
export const getTypeOrmConfig = (): TypeOrmModuleOptions => {
  if (process.env.NODE_ENV === 'test') {
    console.log('🔌 Running in TEST environment, using SQLite database.');
    // Usamos la misma configuración que nuestro setup de E2E
    return getTestDbOptions();
  }

  console.log('🔌 Running in DEV/PROD environment, using PostgreSQL.');
  // Esta es tu configuración por defecto para desarrollo/producción
  return {
    type: 'postgres',
    // ... el resto de tus opciones de conexión a PostgreSQL (host, port, username, etc.)
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production', // `false` en producción
  };
};
