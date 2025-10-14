import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/newdatabase/users/users.service';
import { User } from '@/newdatabase/users/entities/user.entity';
import { AuthModel, LoginModel } from './auth.model';
import { AuthLockdownService } from './auth-lockdown.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private lockdownService: AuthLockdownService, // Inyectamos el servicio de bloqueo
  ) {}

  async validateUser(
    username: string,
    pass: string,
  ): Promise<LoginModel | null> {
    // 1. Buscamos al usuario primero para poder acceder a sus permisos.
    const user = await this.usersService.findOneByUsername(username);

    // Si el usuario no existe, no hay nada más que hacer.
    if (!user) {
      return null;
    }

    // 2. Comprobamos si el usuario tiene el permiso de bypass.
    const hasBypassPermission = user.permisos.some(
      // Un admin o alguien con el permiso específico puede saltarse el bloqueo.
      (p) => p.tipo === 'admin' || p.tipo === 'users:update',
    );

    // 3. Aplicamos la lógica de bloqueo mejorada.
    if (this.lockdownService.isLoginLocked() && !hasBypassPermission) {
      // El bloqueo está activo y el usuario NO tiene el permiso, se rechaza.
      throw new ServiceUnavailableException(
        'El inicio de sesión está deshabilitado temporalmente.',
      );
    } else if (this.lockdownService.isLoginLocked() && hasBypassPermission) {
      // El bloqueo está activo, pero este usuario tiene permiso para saltárselo.
      this.logger.warn(
        `El usuario '${username}' ha iniciado sesión durante el bloqueo del sistema (Permiso: users:update).`,
      );
    }

    // 4. Si pasamos el bloqueo, validamos la contraseña.
    if (await user.validatePassword(pass)) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  login(user: LoginModel) {
    const payload: AuthModel = {
      sub: user.id, // 'sub' es el nombre estándar para el subject (ID del usuario)
      username: user.username,
      permisos: user.permisos.map((p) => p.tipo), // Incluimos los permisos en el token
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  refresh(user: AuthModel) {
    // El objeto 'user' es el payload del JWT ya validado por el JwtAuthGuard.
    // Simplemente necesitamos firmar un nuevo token con el mismo payload.
    const payload: AuthModel = {
      sub: user.sub,
      username: user.username,
      permisos: user.permisos,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.usersService.findOneByUsername(username);
  }
}
