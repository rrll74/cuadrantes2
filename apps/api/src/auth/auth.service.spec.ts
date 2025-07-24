import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '@/newdatabase/users/users.service';
import { AuthLockdownService } from './auth-lockdown.service';
import { User } from '@/newdatabase/users/entities/user.entity';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';
import { LoginModel } from './auth.model';

// --- Mocks y Datos de Prueba ---

// Mock de un usuario con permiso de bypass
const mockUserWithBypass = new User();
mockUserWithBypass.id = 1;
mockUserWithBypass.username = 'admin';
mockUserWithBypass.password = 'hashedpassword';
mockUserWithBypass.permisos = [{ tipo: 'users:update' }] as Permiso[];
mockUserWithBypass.validatePassword = jest.fn();

// Mock de un usuario sin permiso de bypass
const mockUserWithoutBypass = new User();
mockUserWithoutBypass.id = 2;
mockUserWithoutBypass.username = 'user';
mockUserWithoutBypass.password = 'hashedpassword2';
mockUserWithoutBypass.permisos = [{ tipo: 'users:read' }] as Permiso[];
mockUserWithoutBypass.validatePassword = jest.fn();

const mockUsersService = {
  findOneByUsername: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockLockdownService = {
  isLoginLocked: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: typeof mockUsersService;
  let jwtService: typeof mockJwtService;
  let lockdownService: typeof mockLockdownService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AuthLockdownService, useValue: mockLockdownService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    lockdownService = module.get(AuthLockdownService);

    // Limpiamos los mocks antes de cada prueba
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data if credentials are valid and login is not locked', async () => {
      lockdownService.isLoginLocked.mockReturnValue(false);
      usersService.findOneByUsername.mockResolvedValue(mockUserWithoutBypass);
      (mockUserWithoutBypass.validatePassword as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await service.validateUser('user', 'password');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUser } = mockUserWithoutBypass;
      expect(result).toEqual(expectedUser);
      expect(usersService.findOneByUsername).toHaveBeenCalledWith('user');
      expect(mockUserWithoutBypass.validatePassword).toHaveBeenCalledWith(
        'password',
      );
    });

    it('should return null if user does not exist', async () => {
      usersService.findOneByUsername.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      lockdownService.isLoginLocked.mockReturnValue(false);
      usersService.findOneByUsername.mockResolvedValue(mockUserWithoutBypass);
      (mockUserWithoutBypass.validatePassword as jest.Mock).mockResolvedValue(
        false,
      );

      const result = await service.validateUser('user', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should throw ServiceUnavailableException if login is locked and user has no bypass permission', async () => {
      lockdownService.isLoginLocked.mockReturnValue(true);
      usersService.findOneByUsername.mockResolvedValue(mockUserWithoutBypass);

      await expect(service.validateUser('user', 'password')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('should return user data if login is locked but user has bypass permission', async () => {
      lockdownService.isLoginLocked.mockReturnValue(true);
      usersService.findOneByUsername.mockResolvedValue(mockUserWithBypass);
      (mockUserWithBypass.validatePassword as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await service.validateUser('admin', 'password');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...expectedUser } = mockUserWithBypass;
      expect(result).toEqual(expectedUser);
    });
  });

  describe('login', () => {
    it('should return an access_token', () => {
      const user: LoginModel = {
        id: 1,
        username: 'admin',
        permisos: [{ tipo: 'admin' }] as Permiso[],
      };
      const expectedToken = 'some.jwt.token';
      const expectedPayload = {
        sub: user.id,
        username: user.username,
        permisos: ['admin'],
      };

      jwtService.sign.mockReturnValue(expectedToken);

      const result = service.login(user);

      expect(jwtService.sign).toHaveBeenCalledWith(expectedPayload);
      expect(result).toEqual({ access_token: expectedToken });
    });
  });

  describe('refresh', () => {
    it('should return a new access_token from a valid payload', () => {
      const payload = {
        sub: 1,
        username: 'admin',
        permisos: ['admin'],
      };
      const expectedToken = 'new.jwt.token';

      jwtService.sign.mockReturnValue(expectedToken);

      const result = service.refresh(payload);

      expect(jwtService.sign).toHaveBeenCalledWith(payload);
      expect(result).toEqual({ access_token: expectedToken });
    });
  });

  describe('findOneByUsername', () => {
    it('should call usersService.findOneByUsername', async () => {
      usersService.findOneByUsername.mockResolvedValue(mockUserWithBypass);

      const result = await service.findOneByUsername('admin');

      expect(usersService.findOneByUsername).toHaveBeenCalledWith('admin');
      expect(result).toEqual(mockUserWithBypass);
    });
  });
});
