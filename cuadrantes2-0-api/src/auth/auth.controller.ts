import { Controller, Post, UseGuards, Request, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // La petición a POST /auth/login primero pasa por el Guard 'local'
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req) {
    // Si las credenciales son válidas, req.user es poblado por LocalStrategy
    return this.authService.login(req.user);
  }

  // Ejemplo de ruta protegida
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    // req.user es poblado por JwtStrategy con el payload del token
    return req.user;
  }
}
