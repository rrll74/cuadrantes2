import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtStrategy } from './jwt.strategy';
import { TokenDenylistService } from '../token-denylist.service';
import { AuthModel } from '../auth.model';

const mockTokenDenylistService = {
  isDenied: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'JWT_SECRET') {
      return 'test-secret';
    }
    return null;
  }),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let tokenDenylistService: typeof mockTokenDenylistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: TokenDenylistService,
          useValue: mockTokenDenylistService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    tokenDenylistService = module.get(TokenDenylistService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const mockRequest = {
      headers: {
        authorization: 'Bearer valid.token.string',
      },
    } as unknown as Request;

    const mockPayload: AuthModel = {
      sub: 1,
      username: 'testuser',
      permisos: ['users:read'],
    };

    it('should return the payload if token is valid and not in denylist', async () => {
      tokenDenylistService.isDenied.mockReturnValue(false);

      const result = await strategy.validate(mockRequest, mockPayload);

      expect(tokenDenylistService.isDenied).toHaveBeenCalledWith(
        'valid.token.string',
      );
      expect(result).toEqual({
        userId: mockPayload.sub,
        username: mockPayload.username,
        permisos: mockPayload.permisos,
      });
    });

    it('should throw UnauthorizedException if token is in denylist', async () => {
      tokenDenylistService.isDenied.mockReturnValue(true);

      await expect(strategy.validate(mockRequest, mockPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokenDenylistService.isDenied).toHaveBeenCalledWith(
        'valid.token.string',
      );
    });
  });
});
