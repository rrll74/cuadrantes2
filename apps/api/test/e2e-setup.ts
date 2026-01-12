import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '@/newdatabase/users/entities/user.entity';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';

// 1. Definir constantes para los permisos (idealmente, esto viviría en un fichero compartido)
const PERMISSIONS = {
  ADMIN: { tipo: 'admin', descripcion: 'admin' },
  USERS_READ: { tipo: 'users:read', descripcion: 'Usuarios: Leer' },
  USERS_CREATE: { tipo: 'users:create', descripcion: 'Usuarios: Crear' },
  USERS_UPDATE: { tipo: 'users:update', descripcion: 'Usuarios: Actualizar' },
  USERS_DELETE: { tipo: 'users:delete', descripcion: 'Usuarios: Eliminar' },
  JORNADAS_READ: { tipo: 'jornadas:read', descripcion: 'Jornadas: Leer' },
  JORNADAS_WRITE: { tipo: 'jornadas:write', descripcion: 'Jornadas: Escribir' },
} as const;

// 2. Centralizar la configuración de la base de datos de prueba
export const getTestDbOptions = (): DataSourceOptions => ({
  type: 'sqlite',
  database: process.env.E2E_DB_PATH || './test.sqlite', // Lee del .env con un fallback
  entities: [User, Permiso],
  synchronize: true, // `true` es necesario para que el schema se cree en el setup
});
export const seedDatabase = async (dataSource: DataSource) => {
  const permisoRepository = dataSource.getRepository(Permiso);
  const userRepository = dataSource.getRepository(User);

  // --- 1. Limpieza explícita de la base de datos ---
  // Borramos en orden inverso para respetar las claves foráneas.
  // La tabla 'permisos_users' se elimina automáticamente por TypeORM al borrar un usuario.
  // Usamos .clear() que es el método idiomático para borrar todos los registros.
  await userRepository.clear();
  await permisoRepository.clear();
  // Reseteamos la secuencia de autoincremento para SQLite, asegurando IDs predecibles (1, 2, ...)
  await userRepository.query(
    'DELETE FROM "sqlite_sequence" WHERE "name" IN (\'users\', \'permisos\');',
  );

  console.log('🌱 Seeding database...');

  // --- 2. Creación Secuencial de Entidades ---
  // Primero, creamos todos los permisos y nos aseguramos de que estén en la BD.
  const pAdmin = await permisoRepository.save(PERMISSIONS.ADMIN);
  const pUsersRead = await permisoRepository.save(PERMISSIONS.USERS_READ);
  const pUsersCreate = await permisoRepository.save(PERMISSIONS.USERS_CREATE);
  const pUsersUpdate = await permisoRepository.save(PERMISSIONS.USERS_UPDATE);
  const pUsersDelete = await permisoRepository.save(PERMISSIONS.USERS_DELETE);
  const pJornadasRead = await permisoRepository.save(PERMISSIONS.JORNADAS_READ);
  const pJornadasWrite = await permisoRepository.save(
    PERMISSIONS.JORNADAS_WRITE,
  );

  // 3. Obtener contraseñas en texto plano. La entidad se encargará de hashearlas.
  const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'adminpass';
  const userPassword = process.env.E2E_USER_PASSWORD || 'userpass';

  // 4. Ahora, creamos los usuarios con sus relaciones a los permisos ya existentes.
  const adminUser = userRepository.create({
    username: 'testadmin',
    email: 'admin@test.com',
    password: adminPassword,
    permisos: [
      pAdmin,
      pUsersRead,
      pUsersCreate,
      pUsersUpdate,
      pUsersDelete,
      pJornadasRead,
      pJornadasWrite,
    ],
  });
  await userRepository.save(adminUser);

  const regularUser = userRepository.create({
    username: 'testuser',
    email: 'user@test.com',
    password: userPassword,
    permisos: [pUsersRead, pJornadasRead], // Lectura de usuarios y jornadas
  });
  await userRepository.save(regularUser);

  console.log('✅ Database seeded successfully!');
};
