import {
  Controller,
  Post,
  UseGuards,
  Request,
  Get,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
// import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginModel, UserPayload } from './auth.model';
import { HasPermissions } from './decorators/permissions.decorator';
import { AuthLockdownService } from './auth-lockdown.service';
import { StatusGateway } from '@/status/status.gateway';
import { AuthModel } from './auth.model';
import { Public } from './decorators/public.decorator';

// El JwtAuthGuard ya es global, por lo que solo necesitamos aplicar el
// PermissionsGuard a nivel de controlador para que verifique los permisos
// en todas las rutas de este controlador que no sean públicas.
@ApiTags('Auth')
@UseGuards(PermissionsGuard)
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
  @ApiOperation({
    summary: 'Iniciar sesión de usuario',
    description:
      'Autentica a un usuario con su nombre de usuario y contraseña. Si las credenciales son válidas, devuelve un JWT (JSON Web Token).',
  })
  @ApiBody({
    description: 'Credenciales del usuario',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario autenticado con éxito, devuelve un token de acceso.',
  })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas.' })
  @Post('login')
  login(@Request() req: { user: LoginModel }) {
    // Si las credenciales son válidas, req.user es poblado por LocalStrategy
    return this.authService.login(req.user);
  }

  // Ejemplo de ruta protegida
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el perfil del usuario autenticado',
    description:
      'Devuelve la información del usuario (payload) contenida en el token JWT.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payload del token del usuario.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token no válido o no proporcionado.',
  })
  @Get('profile')
  getProfile(@Request() req: { user: UserPayload }) {
    // req.user es poblado por JwtStrategy con el payload del token
    return req.user;
  }

  // Ejemplo de ruta protegida con permisos
  // El JwtAuthGuard global se ejecuta primero, luego el PermissionsGuard
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Acceder a un área restringida para administradores',
    description:
      'Ruta de ejemplo que solo es accesible para usuarios con el permiso "admin".',
  })
  @ApiResponse({ status: 200, description: 'Acceso concedido.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  @HasPermissions('admin')
  @Get('admin-area')
  getAdminArea(@Request() req: { user: UserPayload }) {
    return {
      message: `Bienvenido al área de administración, ${req.user.username}!`,
    };
  }

  // El JwtAuthGuard global se ejecuta primero, luego el PermissionsGuard
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener el estado del bloqueo de inicio de sesión',
    description:
      'Comprueba si el inicio de sesión para usuarios no administradores está actualmente bloqueado. Requiere permiso "users:update".',
  })
  @ApiResponse({ status: 200, description: 'Devuelve el estado del bloqueo.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  @Get('lockdown-status')
  @HasPermissions('users:update') // Solo usuarios con este permiso pueden ver el estado
  getLockdownStatus() {
    return this.lockdownService.getStatus();
  }

  // El JwtAuthGuard global se ejecuta primero, luego el PermissionsGuard
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activar/desactivar el bloqueo de inicio de sesión',
    description:
      'Cambia el estado del bloqueo de inicio de sesión para usuarios no administradores. Requiere permiso "users:update".',
  })
  @ApiResponse({
    status: 201,
    description: 'El estado del bloqueo ha sido cambiado.',
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permisos insuficientes.' })
  @Post('toggle-lockdown')
  @HasPermissions('users:update') // Solo usuarios con este permiso pueden cambiar el estado
  toggleLockdown() {
    const isLocked = this.lockdownService.toggleLockdown();

    // Notificamos a todos los clientes conectados a través del WebSocket
    this.statusGateway.broadcastLockdownStatusChange({ isLocked });

    return { isLocked };
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Refrescar el token de autenticación',
    description:
      'A partir de un token válido (aunque esté a punto de expirar), genera un nuevo token con una nueva fecha de expiración.',
  })
  @ApiResponse({ status: 201, description: 'Nuevo token de acceso generado.' })
  @ApiResponse({ status: 401, description: 'Token original no válido.' })
  @Post('refresh')
  // eslint-disable-next-line @typescript-eslint/require-await
  async refreshToken(@Request() req: { user: AuthModel }) {
    // Simplemente se lo pasamos al servicio para que firme un nuevo token.
    return this.authService.refresh(req.user);
  }
}
