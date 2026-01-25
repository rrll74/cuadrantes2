/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { SeederService } from './seeder.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AVAILABLE_PERMISSIONS } from '@cuadrantes/shared-dto';
import { User } from './users/entities/user.entity';
import { Permiso } from './permisos/entities/permiso.entity';

describe('SeederService', () => {
  let service: SeederService;
  let userRepository: Repository<User>;
  let permisoRepository: Repository<Permiso>;

  // Creamos mocks para cada método que usa el servicio
  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPermisoRepository = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        {
          provide: getRepositoryToken(User, 'new'),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Permiso, 'new'),
          useValue: mockPermisoRepository,
        },
      ],
    }).compile();

    service = module.get<SeederService>(SeederService);
    userRepository = module.get<Repository<User>>(
      getRepositoryToken(User, 'new'),
    );
    permisoRepository = module.get<Repository<Permiso>>(
      getRepositoryToken(Permiso, 'new'),
    );

    // Limpiamos los mocks antes de cada test para asegurar un estado limpio
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedPermissions', () => {
    it('should seed permissions if none exist', async () => {
      // Arrange: Simulamos que no hay permisos en la BD
      mockPermisoRepository.count.mockResolvedValue(0);
      const createdPermisos = []; // Dummy data
      mockPermisoRepository.create.mockReturnValue(createdPermisos);

      // Act: Ejecutamos el método
      await service.seedPermissions();

      // Assert: Verificamos que los métodos del repo fueron llamados
      expect(permisoRepository.findOne).toHaveBeenCalled();
      expect(permisoRepository.create).toHaveBeenCalled();
      expect(permisoRepository.save).toHaveBeenCalledWith(createdPermisos);
    });

    it('should NOT seed permissions if they already exist', async () => {
      // Arrange: Simulamos que ya existen permisos
      mockPermisoRepository.findOne.mockResolvedValue(1);
      const createdPermisos = [{ tipo: 'admin' }]; // Dummy data
      mockPermisoRepository.create.mockReturnValue(createdPermisos);

      // Act
      await service.seedPermissions();

      // Assert: Verificamos que los métodos de creación NO fueron llamados
      // findOne debe ser llamado una vez por cada permiso en AVAILABLE_PERMISSIONS
      expect(permisoRepository.findOne).toHaveBeenCalledTimes(
        AVAILABLE_PERMISSIONS.length,
      );
      expect(permisoRepository.create).not.toHaveBeenCalled();
      expect(permisoRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('seedAdminUser', () => {
    it('should seed admin user if it does not exist', async () => {
      // Arrange: Simulamos que el admin no existe y que hay permisos
      mockUserRepository.findOne.mockResolvedValue(null);
      const allPermisos = AVAILABLE_PERMISSIONS.map((p) => ({
        ...p,
      }));
      mockPermisoRepository.find.mockResolvedValue(allPermisos);
      const createdAdmin = { username: 'admin' }; // Dummy data
      mockUserRepository.create.mockReturnValue(createdAdmin);

      // Act
      await service.seedAdminUser();

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'admin' },
        relations: ['permisos'],
      });
      expect(permisoRepository.find).toHaveBeenCalledTimes(1);
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'admin', permisos: allPermisos }),
      );
      expect(userRepository.save).toHaveBeenCalledWith(createdAdmin);
    });

    it('should NOT seed admin user if it already exists', async () => {
      // Arrange: Simulamos que el admin ya existe con todos los permisos
      mockUserRepository.findOne.mockResolvedValue({
        username: 'admin',
        permisos: AVAILABLE_PERMISSIONS.map((p) => ({ ...p })),
      });
      // El find retorna todos los permisos (simulando que ya están en la BD)
      mockPermisoRepository.find.mockResolvedValue(
        AVAILABLE_PERMISSIONS.map((p) => ({ ...p })),
      );

      // Act
      await service.seedAdminUser();

      // Assert
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
      // find puede ser llamado para obtener permisos
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});
