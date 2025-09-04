/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

// Mock del Reflector para controlar qué metadatos se "leen" de los decoradores
const mockReflector = {
  getAllAndOverride: jest.fn(),
};

// Función de ayuda para crear un mock del ExecutionContext
const createMockExecutionContext = (): ExecutionContext => {
  const mockRequest = {};
  // Funciones dummy para que getHandler y getClass devuelvan algo
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

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: typeof mockReflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true for a public route', () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        expect.any(Function),
        expect.any(Function),
      ]);
    });

    it('should defer to parent canActivate for a protected route', () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();

      // Espiamos el método `canActivate` de la clase padre (AuthGuard)
      const superCanActivateSpy = jest
        .spyOn(Object.getPrototypeOf(guard), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(superCanActivateSpy).toHaveBeenCalledWith(context);

      superCanActivateSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return the user when authentication is successful', () => {
      const user = { userId: 1, username: 'test' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException if err is provided or user is missing', () => {
      const error = new Error('Auth error');
      expect(() => guard.handleRequest(error, null, null)).toThrow(error);
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
