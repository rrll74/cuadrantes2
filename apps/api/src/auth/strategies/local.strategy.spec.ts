import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';
import { User } from '@/newdatabase/users/entities/user.entity';

const mockAuthService = {
  validateUser: jest.fn(),
};

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return the user if validation is successful', async () => {
      const mockUser = new User();
      mockUser.id = 1;
      mockUser.username = 'test';

      authService.validateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate('test', 'password');

      expect(authService.validateUser).toHaveBeenCalledWith('test', 'password');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if validation fails', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(strategy.validate('test', 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
