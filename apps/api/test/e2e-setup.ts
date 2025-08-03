import { register } from 'tsconfig-paths';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
const tsconfig = require('../tsconfig.json');
import { resolve } from 'path';

// --- REGISTRO MANUAL DE ALIAS DE TSCONFIG ---
// Esto debe hacerse ANTES de cualquier import que use un alias.
// Le decimos a Node.js cómo resolver las rutas como '@/...'.
const tsConfigBasePath = resolve(__dirname, '..'); // Resuelve a la carpeta 'apps/api'
register({
  baseUrl: tsConfigBasePath,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  paths: tsconfig.compilerOptions.paths,
});

import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '@/newdatabase/users/entities/user.entity';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';
import { config } from 'dotenv';

// 1. Cargar variables de entorno desde .env.test.local
// Esto asegura que el setup no dependa de que Jest cargue las variables.
config({ path: resolve(__dirname, '../.env.test.local') });

// 2. Definir constantes para los permisos (idealmente, esto viviría en un fichero compartido)
const PERMISSIONS = {
  ADMIN: { tipo: 'admin', descripcion: 'admin' },
  USERS_READ: { tipo: 'users:read', descripcion: 'Usuarios: Leer' },
  USERS_CREATE: { tipo: 'users:create', descripcion: 'Usuarios: Crear' },
  USERS_UPDATE: { tipo: 'users:update', descripcion: 'Usuarios: Actualizar' },
  USERS_DELETE: { tipo: 'users:delete', descripcion: 'Usuarios: Eliminar' },
} as const;

// 3. Centralizar la configuración de la base de datos de prueba
const getTestDbOptions = (): DataSourceOptions => ({
  type: 'sqlite',
  database: process.env.E2E_DB_PATH || './test.sqlite', // Lee del .env con un fallback
  entities: [User, Permiso],
  synchronize: true, // `true` es necesario para que el schema se cree en el setup
});

const seedDatabase = async (dataSource: DataSource) => {
  const permisoRepository = dataSource.getRepository(Permiso);
  const userRepository = dataSource.getRepository(User);

  console.log('🌱 Seeding database...');

  // 4. Crear Permisos en paralelo usando constantes
  const [pAdmin, pUsersRead, pUsersCreate, pUsersUpdate, pUsersDelete] =
    await Promise.all([
      permisoRepository.save({
        tipo: PERMISSIONS.ADMIN.tipo,
        descripcion: PERMISSIONS.ADMIN.descripcion,
      }),
      permisoRepository.save({
        tipo: PERMISSIONS.USERS_READ.tipo,
        descripcion: PERMISSIONS.USERS_READ.descripcion,
      }),
      permisoRepository.save({
        tipo: PERMISSIONS.USERS_CREATE.tipo,
        descripcion: PERMISSIONS.USERS_CREATE.descripcion,
      }),
      permisoRepository.save({
        tipo: PERMISSIONS.USERS_UPDATE.tipo,
        descripcion: PERMISSIONS.USERS_UPDATE.descripcion,
      }),
      permisoRepository.save({
        tipo: PERMISSIONS.USERS_DELETE.tipo,
        descripcion: PERMISSIONS.USERS_DELETE.descripcion,
      }),
    ]);

  // 5. Obtener contraseñas en texto plano. La entidad se encargará de hashearlas.
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'adminpass';
  const userPassword = process.env.E2E_USER_PASSWORD || 'userpass';

  // 6. Crear Usuarios
  const adminUser = userRepository.create({
    username: 'testadmin',
    email: 'admin@test.com',
    password: adminPassword,
    permisos: [pAdmin, pUsersRead, pUsersCreate, pUsersUpdate, pUsersDelete],
  });

  const regularUser = userRepository.create({
    username: 'testuser',
    email: 'user@test.com',
    password: userPassword,
    // isActive: true,
    permisos: [pUsersRead], // Solo tiene permiso de lectura
  });

  // Guardar ambos usuarios en una sola operación
  await userRepository.save([adminUser, regularUser]);

  console.log('✅ Database seeded successfully!');
};

/**
 * Esta función se ejecuta por Jest antes de todas las suites de pruebas.
 */
export default async () => {
  console.log('\n\n-- E2E Global Setup --');
  const dataSource = new DataSource(getTestDbOptions());

  try {
    await dataSource.initialize();
    console.log('Test database connection established.');

    // Sincroniza y borra la base de datos para asegurar un estado limpio
    await dataSource.synchronize(true);
    console.log('Database schema synchronized.');

    await seedDatabase(dataSource);
  } catch (error) {
    console.error('Error during global setup:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
};
