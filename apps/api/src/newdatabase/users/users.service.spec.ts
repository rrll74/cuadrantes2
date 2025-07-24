import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { ConnectionStatusService } from '@/status/connection-status.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserPresenter } from './presenters/user.presenter';

// --- Mocks y Datos de Prueba ---

const mockUser = new User();
mockUser.id = 1;
mockUser.username = 'testuser';
mockUser.email = 'test@test.com';
mockUser.password = 'hashedpassword';
// mockUser.isActive = true;
mockUser.permisos = [];

const mockUserArray = [mockUser];

// Mock complejo para el QueryBuilder
const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(mockUser),
};

const mockUserRepository = {
  find: jest.fn().mockResolvedValue(mockUserArray),
  findOne: jest.fn().mockResolvedValue(mockUser),
  create: jest.fn().mockReturnValue(new User()),
  save: jest.fn().mockResolvedValue(mockUser),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
};

const mockConnectionStatusService = {
  isConnected: jest.fn(),
};

// Mockear bcrypt
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('somesalt'),
  hash: jest.fn().mockResolvedValue('hashedpassword'),
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
    it('should create a user and hash the password if provided', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'new@test.com',
        password: 'plainpassword',
      };

      const createdUser = { ...new User(), ...createUserDto };
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue({
        ...createdUser,
        id: 2,
        password: 'hashedpassword',
      });

      const result = await service.create(createUserDto);

      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('plainpassword', 'somesalt');
      expect(repository.create).toHaveBeenCalledWith(createUserDto);
      expect(repository.save).toHaveBeenCalledWith(createdUser);
      expect(result.password).toBeUndefined();
    });

    it('should create a user without hashing if password is not provided', async () => {
      const createUserDto: CreateUserDto = {
        username: 'newuser',
        email: 'new@test.com',
      };
      const createdUser = { ...new User(), ...createUserDto };
      mockUserRepository.create.mockReturnValue(createdUser);
      mockUserRepository.save.mockResolvedValue({ ...createdUser, id: 2 });

      await service.create(createUserDto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of user presenters', async () => {
      mockConnectionStatusService.isConnected.mockReturnValue(true);

      const users = await service.findAll();

      expect(users).toHaveLength(1);
      expect(users[0]).toBeInstanceOf(UserPresenter);
      expect(users[0].password).toBeUndefined();
      expect(users[0].isConnected).toBe(true);
      expect(repository.find).toHaveBeenCalled();
      expect(connectionStatusService.isConnected).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('findOneById', () => {
    it('should find and return a user by ID', async () => {
      mockConnectionStatusService.isConnected.mockReturnValue(false);

      const user = await service.findOneById(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(user).toBeInstanceOf(UserPresenter);
      expect(user.username).toEqual(mockUser.username);
      expect(user.isConnected).toBe(false);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      await expect(service.findOneById(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOneByUsername', () => {
    it('should find a user by username using the query builder', async () => {
      const result = await service.findOneByUsername('testuser');

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.username = :username',
        { username: 'testuser' },
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.password');
      expect(mockQueryTuilder.getOne).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
      expect(result.password).toBe('hashedpassword');
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
      // Hacemos un mock del servicio en sí mismo para no tener que mockear findOneById
      jest
        .spyOn(service, 'findOneById')
        .mockResolvedValue(new UserPresenter(mockUser, false));

      await service.update(1, updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 'somesalt');
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashedpassword' }),
      );
    });

    it('should update a user without touching the password if not provided', async () => {
      const updateUserDto = { email: 'newemail@test.com' };
      jest
        .spyOn(service, 'findOneById')
        .mockResolvedValue(new UserPresenter(mockUser, false));

      await service.update(1, updateUserDto);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'newemail@test.com' }),
      );
    });

    it('should throw NotFoundException if user to update is not found', async () => {
      jest
        .spyOn(service, 'findOneById')
        .mockRejectedValue(new NotFoundException());
      await expect(service.update(99, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      mockUserRepository.delete.mockResolvedValue({ affected: 1 });
      await service.remove(1);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user to remove is not found', async () => {
      mockUserRepository.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
