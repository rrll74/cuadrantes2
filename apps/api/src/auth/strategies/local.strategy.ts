import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { LoginModel } from '../auth.model';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private authService: AuthService) {
    // Por defecto, passport-local espera 'username' y 'password'.
    super({ usernameField: 'username', passwordField: 'password' });
  }

  async validate(username: string, pass: string): Promise<LoginModel> {
    const user = await this.authService.validateUser(username, pass);

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return user;
  }
}
