import { Controller, Post, UseGuards, Request, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginModel, UserPayload } from './auth.model';
import { PermissionsGuard } from './guards/permissions.guard';
import { HasPermissions } from './decorators/permissions.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // La petición a POST /auth/login primero pasa por el Guard 'local'
  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req: { user: LoginModel }) {
    // Si las credenciales son válidas, req.user es poblado por LocalStrategy
    return this.authService.login(req.user);
  }

  // Ejemplo de ruta protegida
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req: { user: UserPayload }) {
    // req.user es poblado por JwtStrategy con el payload del token
    return req.user;
  }

  // Ejemplo de ruta protegida con permisos
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @HasPermissions('admin')
  @Get('admin-area')
  getAdminArea(@Request() req: { user: UserPayload }) {
    return {
      message: `Bienvenido al área de administración, ${req.user.username}!`,
    };
  }
}
