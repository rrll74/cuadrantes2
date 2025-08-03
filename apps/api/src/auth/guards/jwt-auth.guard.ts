/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// /home/ramon/code/cuadrantes2/apps/api/src/auth/guards/jwt-auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const request = context.switchToHttp().getRequest();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  // Sobrescribimos este método para personalizar el manejo de errores
  // y permitir que las rutas sean opcionalmente autenticadas.
  handleRequest(err, user, info) {
    // 'user' será el objeto retornado por el método validate() de tu JwtStrategy.
    // 'info' puede contener información sobre el error, como 'TokenExpiredError'.
    // 'err' será cualquier excepción lanzada explícitamente.

    if (err || !user) {
      // Si quieres que una ruta sea pública pero que pueda recibir un token,
      // no lances un error aquí. En su lugar, podrías retornar 'null' o 'undefined'.
      // El controlador tendría que verificar si 'req.user' existe.
      // Para rutas estrictamente protegidas, lanzar el error es lo correcto.

      // Puedes añadir logs para depuración
      if (info) {
        this.logger.error(`Error de autenticación JWT: ${info.message}`);
      }

      throw err || new UnauthorizedException('Token inválido o expirado.');
    }

    // Si todo está bien, devolvemos el usuario, que se adjuntará a req.user.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
