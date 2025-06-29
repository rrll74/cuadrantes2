import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPayload } from '../auth.model';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const { user }: { user: UserPayload } = context.switchToHttp().getRequest();

    const hasAllPermissions = requiredPermissions.every((p) =>
      user.permisos?.includes(p),
    );

    if (user?.permisos && hasAllPermissions) {
      return true;
    }

    throw new ForbiddenException(
      'No tienes los permisos necesarios para acceder a este recurso.',
    );
  }
}
