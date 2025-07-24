// /home/ramon/code/cuadrantes2/apps/api/src/auth/guards/jwt-auth.guard.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        console.error(`Error de autenticación JWT: ${info.message}`);
      }

      throw err || new UnauthorizedException('Token inválido o expirado.');
    }

    // Si todo está bien, devolvemos el usuario, que se adjuntará a req.user.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return user;
  }
}
