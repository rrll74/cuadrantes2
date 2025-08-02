import { Test, TestingModule } from '@nestjs/testing';
import { TokenDenylistService } from './token-denylist.service';

describe('TokenDenylistService', () => {
  let service: TokenDenylistService;

  // Habilitamos los temporizadores falsos de Jest antes de todas las pruebas en este archivo.
  beforeAll(() => {
    jest.useFakeTimers();
  });

  // Restauramos los temporizadores reales después de que todas las pruebas hayan terminado.
  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenDenylistService],
    }).compile();

    service = module.get<TokenDenylistService>(TokenDenylistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deny and isDenied', () => {
    it('should mark a token as denied immediately after calling deny', () => {
      const token = 'denied-token';
      service.deny(token, 5000); // Denegar por 5 segundos
      expect(service.isDenied(token)).toBe(true);
    });

    it('should return false for a token that has not been denied', () => {
      const token = 'valid-token';
      expect(service.isDenied(token)).toBe(false);
    });
  });

  describe('token expiration logic', () => {
    it('should automatically remove a token from the denylist after it expires', () => {
      const token = 'expiring-token';
      const expiresInMs = 10000; // 10 segundos

      // 1. Denegar el token
      service.deny(token, expiresInMs);
      expect(service.isDenied(token)).toBe(true);

      // 2. Avanzar el tiempo justo hasta el borde de la expiración
      jest.advanceTimersByTime(expiresInMs - 1);
      expect(service.isDenied(token)).toBe(true); // Aún debe estar denegado

      // 3. Avanzar el tiempo 1ms más para cruzar el umbral de expiración
      jest.advanceTimersByTime(1);
      expect(service.isDenied(token)).toBe(false); // Ahora debe ser válido de nuevo
    });

    it('should handle multiple tokens with different expiration times correctly', () => {
      const tokenA = 'token-a';
      const tokenB = 'token-b';
      const expirationA = 5000;
      const expirationB = 10000;

      service.deny(tokenA, expirationA);
      service.deny(tokenB, expirationB);

      // Avanzar el tiempo para que expire el token A pero no el B
      jest.advanceTimersByTime(expirationA);

      expect(service.isDenied(tokenA)).toBe(false);
      expect(service.isDenied(tokenB)).toBe(true);

      // Avanzar el tiempo restante para que expire el token B
      jest.advanceTimersByTime(expirationB - expirationA);
      expect(service.isDenied(tokenB)).toBe(false);
    });
  });
});
