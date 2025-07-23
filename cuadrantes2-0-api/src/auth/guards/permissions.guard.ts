import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPayload } from '../auth.model';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ANY_PERMISSIONS_KEY } from '../decorators/any-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener permisos para la lógica AND (debe tener todos)
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      // Obtener permisos para la lógica OR (debe tener al menos uno)
      const anyRequiredPermission = this.reflector.get<string[]>(
        ANY_PERMISSIONS_KEY,
        context.getHandler(),
      );

      // Si no se requiere ningún permiso, permitir el acceso
      if (!requiredPermissions && !anyRequiredPermission) {
        return true;
      }
    }

    const { user }: { user: UserPayload } = context.switchToHttp().getRequest();

    if (!user || !user.permisos) {
      throw new ForbiddenException('No tienes los permisos necesarios.');
    }

    // Validar lógica AND si es necesario
    if (
      requiredPermissions &&
      !requiredPermissions.every((p) => user.permisos.includes(p))
    ) {
      throw new ForbiddenException('No tienes todos los permisos necesarios.');
    }

    // Validar lógica OR si es necesario
    if (
      requiredPermissions &&
      !requiredPermissions.some((p) => user.permisos.includes(p))
    ) {
      throw new ForbiddenException(
        'No tienes ninguno de los permisos requeridos.',
      );
    }

    return true;
  }
}
