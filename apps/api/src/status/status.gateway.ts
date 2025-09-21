import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConnectionStatusService } from './connection-status.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@/newdatabase/users/users.service';
import { TokenDenylistService } from '@/auth/token-denylist.service';
import { AuthModel } from '@/auth/auth.model';

/**
 * Define la estructura del objeto de error emitido por Engine.IO
 * para el evento 'connection_error'. Esto proporciona seguridad de tipos
 * y autocompletado en el editor.
 */
interface EngineIoError {
  code: number;
  message: string;
  context?: any;
}

// --- Configuración de CORS más flexible ---
// En desarrollo, permitimos localhost.
// En producción, leemos el dominio permitido desde una variable de entorno.
const allowedOrigins: string[] = [];
if (process.env.NODE_ENV !== 'production') {
  const gestionPort = process.env.GESTION_PORT ?? '3002';
  allowedOrigins.push(
    `http://localhost:${gestionPort}`,
    `http://127.0.0.1:${gestionPort}`,
  );
}
if (process.env.CORS_ALLOWED_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ALLOWED_ORIGIN);
}

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.indexOf(origin) !== -1 ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.1.') ||
        origin.startsWith('http://172.')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class StatusGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('StatusGateway');

  constructor(
    private readonly connectionStatusService: ConnectionStatusService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService, // Inyectamos UsersService
    private readonly tokenDenylistService: TokenDenylistService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');

    // Diagnóstico: Escuchar errores de bajo nivel en el motor de Engine.IO
    // Esto nos dirá exactamente por qué el servidor responde con '400 Bad Request'.
    const engine = server.engine;
    engine.on('connection_error', (err: EngineIoError) => {
      this.logger.error(`Engine.IO Connection Error:
        Code: ${err.code}
        Message: ${err.message}
        Context: ${JSON.stringify(err.context)}
      `);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleConnection(client: Socket, ...args: unknown[]) {
    try {
      // 1. Asignar a 'unknown' para forzar la comprobación de tipo.
      const token: unknown = client.handshake.auth.token;

      // 2. Usar un type guard para verificar que el token es una cadena no vacía.
      if (typeof token !== 'string' || token.length === 0) {
        throw new UnauthorizedException(
          'No se proporcionó un token de autenticación válido.',
        );
      }

      // A partir de aquí, TypeScript sabe que 'token' es de tipo 'string'.
      const payload: AuthModel = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      // The 'token' is already validated and typed as string, so it's safe to pass.
      this.connectionStatusService.addUser(userId, client.id, token);
      this.logger.log(
        `Cliente autenticado y conectado: ${client.id}, UserID: ${userId}`,
      );

      // Notificar a todos que este usuario está ahora conectado
      this.broadcast('user:connected', { userId });
    } catch (error) {
      this.logger.error(
        `Autenticación fallida para cliente ${client.id}: ${String(error)}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectionStatusService.removeUserBySocketId(client.id);
    if (userId) {
      this.logger.log(`Cliente desconectado: ${client.id}, UserID: ${userId}`);
      // Notificar a todos que este usuario se ha desconectado
      this.broadcast('user:disconnected', { userId });
    }
  }

  // Método para emitir un evento a todos los clientes conectados
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  /**
   * Emite un evento a todos los clientes para notificar un cambio
   * en el estado de bloqueo de inicio de sesión.
   */
  public broadcastLockdownStatusChange(status: { isLocked: boolean }) {
    this.server.emit('auth:lockdown_status_changed', status);
  }

  @SubscribeMessage('admin:disconnect_user')
  async handleAdminDisconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: number },
  ) {
    try {
      // 1. Obtener el ID del administrador que realiza la acción
      const adminUserId = this.connectionStatusService.getUserIdBySocketId(
        client.id,
      );
      if (!adminUserId) {
        throw new UnauthorizedException(
          'No se pudo identificar al administrador.',
        );
      }

      // 2. Verificar si el administrador tiene permisos
      const adminUser = await this.usersService.findOneById(adminUserId);
      const hasPermission = adminUser!.permisos.some(
        (p) => p.tipo === 'users:update',
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          'No tienes permiso para realizar esta acción.',
        );
      }

      // 3. Obtener datos del usuario objetivo
      const targetUserId = payload.userId;
      const targetSocketId =
        this.connectionStatusService.getSocketIdByUserId(targetUserId);

      if (!targetSocketId) {
        this.logger.warn(
          `Intento de desconectar a un usuario no conectado: ${targetUserId}`,
        );
        return;
      }

      // 4. Invalidar el token (Cierre de Sesión)
      const tokenToDeny =
        this.connectionStatusService.getTokenByUserId(targetUserId);
      if (tokenToDeny) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const decodedToken = this.jwtService.decode(tokenToDeny) as {
          exp: number;
        };
        const expiresInMs = decodedToken.exp * 1000 - Date.now();
        if (expiresInMs > 0) {
          this.tokenDenylistService.deny(tokenToDeny, expiresInMs);
        }
      }

      // 5. Desconectar el socket
      const targetSocket = this.server.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.disconnect(true); // true fuerza la desconexión desde el servidor
      }

      this.logger.log(
        `Admin ${adminUserId} forzó el cierre de sesión y desconexión para el usuario ${targetUserId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error en admin:disconnect_user: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Opcional: emitir un error de vuelta al admin, asegurando que 'error' tenga una propiedad 'message'
      client.emit('admin:action_error', { message: String(error) });
    }
  }
}
