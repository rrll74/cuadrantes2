import { Controller, Post, UseGuards, Request, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginModel, UserPayload } from './auth.model';
import { PermissionsGuard } from './guards/permissions.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { HasPermissions } from './decorators/permissions.decorator';
import { AuthLockdownService } from './auth-lockdown.service';
import { StatusGateway } from '@/status/status.gateway';
import { AuthModel } from './auth.model';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private lockdownService: AuthLockdownService,
    private statusGateway: StatusGateway,
  ) {}

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

  @Get('lockdown-status')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @HasPermissions('users:update') // Solo usuarios con este permiso pueden ver el estado
  getLockdownStatus() {
    return this.lockdownService.getStatus();
  }

  @Post('toggle-lockdown')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @HasPermissions('users:update') // Solo usuarios con este permiso pueden cambiar el estado
  toggleLockdown() {
    const isLocked = this.lockdownService.toggleLockdown();

    // Notificamos a todos los clientes conectados a través del WebSocket
    this.statusGateway.broadcastLockdownStatusChange({ isLocked });

    return { isLocked };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  // eslint-disable-next-line @typescript-eslint/require-await
  async refreshToken(@Request() req: { user: AuthModel }) {
    // El JwtAuthGuard ya ha validado el token y ha adjuntado el payload a req.user.
    // Simplemente se lo pasamos al servicio para que firme un nuevo token.
    return this.authService.refresh(req.user);
  }
}
