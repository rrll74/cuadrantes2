import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../src/newdatabase/users/entities/user.entity';
import { Permiso } from '../src/newdatabase/permisos/entities/permiso.entity';
import * as bcrypt from 'bcrypt';

const testDbOptions: DataSourceOptions = {
  type: 'sqlite',
  database: './test.sqlite', // Usamos un archivo para que persista entre el setup y la ejecución de tests
  entities: [User, Permiso],
  synchronize: true, // true para crear el schema automáticamente
};

const seedDatabase = async (dataSource: DataSource) => {
  const permisoRepository = dataSource.getRepository(Permiso);
  const userRepository = dataSource.getRepository(User);

  console.log('🌱 Seeding database...');

  // 1. Crear Permisos
  const pAdmin = await permisoRepository.save({ tipo: 'admin' });
  const pUsersRead = await permisoRepository.save({ tipo: 'users:read' });
  const pUsersCreate = await permisoRepository.save({ tipo: 'users:create' });
  const pUsersUpdate = await permisoRepository.save({ tipo: 'users:update' });
  const pUsersDelete = await permisoRepository.save({ tipo: 'users:delete' });

  // 2. Hashear contraseñas
  const salt = await bcrypt.genSalt();
  const adminPassword = await bcrypt.hash('adminpass', salt);
  const userPassword = await bcrypt.hash('userpass', salt);

  // 3. Crear Usuarios
  const adminUser = userRepository.create({
    username: 'testadmin',
    email: 'admin@test.com',
    password: adminPassword,
    // isActive: true,
    permisos: [pAdmin, pUsersRead, pUsersCreate, pUsersUpdate, pUsersDelete],
  });
  await userRepository.save(adminUser);

  const regularUser = userRepository.create({
    username: 'testuser',
    email: 'user@test.com',
    password: userPassword,
    // isActive: true,
    permisos: [pUsersRead], // Solo tiene permiso de lectura
  });
  await userRepository.save(regularUser);

  console.log('✅ Database seeded successfully!');
};

/**
 * Esta función se ejecuta por Jest antes de todas las suites de pruebas.
 */
export default async () => {
  console.log('\n\n-- E2E Global Setup --');
  const dataSource = new DataSource(testDbOptions);

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
