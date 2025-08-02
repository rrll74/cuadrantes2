import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserPayload } from '../auth.model';

// Mock del Reflector para controlar qué permisos se "leen" de los decoradores
const mockReflector = {
  getAllAndOverride: jest.fn(),
  get: jest.fn(),
};

// Función de ayuda para crear un mock del ExecutionContext
const createMockExecutionContext = (
  user: UserPayload | null,
): ExecutionContext => {
  const mockRequest = { user };
  // Funciones dummy para que getHandler y getClass devuelvan una función, no undefined
  const handler = () => {};
  const controllerClass = class {};

  return {
    getHandler: jest.fn().mockReturnValue(handler),
    getClass: jest.fn().mockReturnValue(controllerClass),
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;
};

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: typeof mockReflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<PermissionsGuard>(PermissionsGuard);
    reflector = module.get(Reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no permissions are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    reflector.get.mockReturnValue(undefined); // Simular que tampoco hay permisos OR
    const context = createMockExecutionContext(null); // No importa el usuario
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has all required permissions', () => {
    const requiredPermissions = ['users:read', 'users:update'];
    reflector.getAllAndOverride.mockReturnValue(requiredPermissions);

    const userWithPermissions: UserPayload = {
      userId: 1,
      username: 'admin',
      permisos: ['users:read', 'users:update', 'admin'],
    };
    const context = createMockExecutionContext(userWithPermissions);

    expect(guard.canActivate(context)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  it('should deny access if user is missing a required permission', () => {
    const requiredPermissions = ['users:read', 'users:delete'];
    reflector.getAllAndOverride.mockReturnValue(requiredPermissions);

    const userWithoutPermissions: UserPayload = {
      userId: 2,
      username: 'user',
      permisos: ['users:read'], // Le falta 'users:delete'
    };
    const context = createMockExecutionContext(userWithoutPermissions);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access if the request has no user object', () => {
    const requiredPermissions = ['users:read'];
    reflector.getAllAndOverride.mockReturnValue(requiredPermissions);
    const context = createMockExecutionContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny access if the user object has no permissions array', () => {
    const requiredPermissions = ['users:read'];
    reflector.getAllAndOverride.mockReturnValue(requiredPermissions);
    const userWithoutPermisosProp = {
      userId: 1,
      username: 'test',
    } as UserPayload;
    const context = createMockExecutionContext(userWithoutPermisosProp);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
