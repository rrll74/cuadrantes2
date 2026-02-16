import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
// import { FindManyOptions, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { ConnectionStatusService } from '@/status/connection-status.service';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { Repository } from 'typeorm';
// import { UserResponseDto } from './dto/user-response.dto';
// --- Mocks y Datos de Prueba ---

const mockUser = new User();
mockUser.id = 1;
mockUser.username = 'testuser';
mockUser.email = 'test@test.com';
mockUser.password = 'hashedpassword';
mockUser.permisos = [];

const mockUserArray = [mockUser];

// Mock complejo para el QueryBuilder
const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(mockUser),
};

const mockUserRepository = {
  find: jest.fn().mockResolvedValue(mockUserArray),
  findOne: jest.fn().mockResolvedValue(mockUser),
  findOneBy: jest.fn().mockResolvedValue(mockUser),
  create: jest.fn().mockReturnValue(new User()),
  save: jest.fn().mockResolvedValue(mockUser),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

const mockPermisoRepository = {
  findBy: jest.fn().mockResolvedValue([]),
};

const mockConnectionStatusService = {
  isUserConnected: jest.fn(),
};

// Mockear bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let connectionStatusService: ConnectionStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User, 'new'),
          useValue: mockUserRepository,
        },
        {
          provide: ConnectionStatusService,
          useValue: mockConnectionStatusService,
        },
        {
          provide: getRepositoryToken(Permiso, 'new'),
          useValue: mockPermisoRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User, 'new'));
    connectionStatusService = module.get<ConnectionStatusService>(
      ConnectionStatusService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'new@test.com',
        password: 'plainpassword',
        permisos: [],
      };

      const createdUser = new User();
      Object.assign(createdUser, createUserDto);

      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue({
        ...createdUser,
        id: 2,
      });

      const result = await service.create(createUserDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.create).toHaveBeenCalledWith({
        ...createUserDto,
        permisos: [],
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.save).toHaveBeenCalledWith(createdUser);
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return an array of user response DTOs', async () => {
      mockConnectionStatusService.isUserConnected.mockReturnValue(true);

      const users = await service.findAll();

      expect(users).toHaveLength(1);
      // El método ahora devuelve un objeto plano que coincide con la interfaz, no una instancia de clase.
      expect(users[0]).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          isConnected: true,
        }),
      );
      expect(users[0].isConnected).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.find).toHaveBeenCalledWith({
        relations: ['permisos'],
        order: { id: 'ASC' },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(connectionStatusService.isUserConnected).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('findOneById', () => {
    it('should find and return a user by ID', async () => {
      mockConnectionStatusService.isUserConnected.mockReturnValue(false);

      const user = await service.findOneById(1);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(user).toBeInstanceOf(User);
      expect(user?.username).toEqual(mockUser.username);
    });

    it('should return Null if user is not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      await expect(service.findOneById(99)).resolves.toBeNull();
    });
  });

  describe('getSelfUser', () => {
    it('should return the authenticated user response data', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockConnectionStatusService.isUserConnected.mockReturnValue(false);

      const result = await service.getSelfUser(mockUser.id);

      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        }),
      );
    });

    it('should throw NotFoundException if user is missing', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getSelfUser(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByUsername', () => {
    it('should find a user by username using the query builder', async () => {
      const result = await service.findOneByUsername('testuser');

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'user.permisos',
        'permiso',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.username = :username',
        { username: 'testuser' },
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.password');
      expect(mockQueryBuilder.getOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
      expect(result?.password).toBe('hashedpassword');
    });

    it('should return null if user is not found by username', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      const result = await service.findOneByUsername('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a user and re-hash the password if provided', async () => {
      const updateUserDto = { password: 'newpassword' };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      await service.update(1, updateUserDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashedpassword' }),
      );
    });

    it('should update a user without touching the password if not provided', async () => {
      const updateUserDto = { email: 'newemail@test.com' };
      mockUserRepository.findOneBy.mockResolvedValue(mockUser);

      await service.update(1, updateUserDto);
      expect(bcrypt.hash).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'newemail@test.com' }),
      );
    });

    it('should throw NotFoundException if user to update is not found', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);
      await expect(service.update(99, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSelfUser', () => {
    it('should reject when no data is provided', async () => {
      await expect(
        service.updateSelfUser(mockUser.id, {
          currentPassword: 'currentpass',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when current password is missing', async () => {
      await expect(
        service.updateSelfUser(mockUser.id, {
          email: 'new@test.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update email and password when current password matches', async () => {
      const updatedUser = { ...mockUser, email: 'new@test.com' } as User;
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockUser,
        password: 'hashedpassword',
      });
      mockUserRepository.save.mockResolvedValue(updatedUser);

      const result = await service.updateSelfUser(mockUser.id, {
        email: 'new@test.com',
        currentPassword: 'currentpass',
        newPassword: 'newpass123',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'currentpass',
        'hashedpassword',
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10);
      expect(result.email).toBe('new@test.com');
    });

    it('should reject when email is already in use', async () => {
      const otherUser = { ...mockUser, id: 2, email: 'other@test.com' } as User;
      mockQueryBuilder.getOne.mockResolvedValue({
        ...mockUser,
        password: 'hashedpassword',
      });
      mockUserRepository.findOne.mockResolvedValue(otherUser);

      await expect(
        service.updateSelfUser(mockUser.id, {
          email: 'other@test.com',
          currentPassword: 'currentpass',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      mockUserRepository.delete.mockResolvedValue({ affected: 1 });
      await service.remove(1);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user to remove is not found', async () => {
      mockUserRepository.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
