import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginModel, UserPayload } from './auth.model';
import { HasPermissions } from './decorators/permissions.decorator';
import { AuthLockdownService } from './auth-lockdown.service';
import { StatusGateway } from '@/status/status.gateway';
import { AuthModel } from './auth.model';
import { Public } from './decorators/public.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard) // Aplicar guardias a nivel de controlador
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private lockdownService: AuthLockdownService,
    private statusGateway: StatusGateway,
  ) {}

  // La petición a POST /auth/login primero pasa por el Guard 'local'
  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req: { user: LoginModel }) {
    // Si las credenciales son válidas, req.user es poblado por LocalStrategy
    return this.authService.login(req.user);
  }

  // Ejemplo de ruta protegida
  @Get('profile')
  getProfile(@Request() req: { user: UserPayload }) {
    // req.user es poblado por JwtStrategy con el payload del token
    return req.user;
  }

  // Ejemplo de ruta protegida con permisos
  // El JwtAuthGuard global se ejecuta primero, luego el PermissionsGuard
  @HasPermissions('admin')
  @Get('admin-area')
  getAdminArea(@Request() req: { user: UserPayload }) {
    return {
      message: `Bienvenido al área de administración, ${req.user.username}!`,
    };
  }

  // El JwtAuthGuard global se ejecuta primero, luego el PermissionsGuard
  @Get('lockdown-status')
  @HasPermissions('users:update') // Solo usuarios con este permiso pueden ver el estado
  getLockdownStatus() {
    return this.lockdownService.getStatus();
  }

  // El JwtAuthGuard global se ejecuta primero, luego el PermissionsGuard
  @Post('toggle-lockdown')
  @HasPermissions('users:update') // Solo usuarios con este permiso pueden cambiar el estado
  toggleLockdown() {
    const isLocked = this.lockdownService.toggleLockdown();

    // Notificamos a todos los clientes conectados a través del WebSocket
    this.statusGateway.broadcastLockdownStatusChange({ isLocked });

    return { isLocked };
  }

  @Post('refresh')
  // eslint-disable-next-line @typescript-eslint/require-await
  async refreshToken(@Request() req: { user: AuthModel }) {
    // Simplemente se lo pasamos al servicio para que firme un nuevo token.
    return this.authService.refresh(req.user);
  }
}
