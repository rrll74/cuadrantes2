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

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3002', // El origen de tu frontend
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
    engine.on('connection_error', (err) => {
      this.logger.error(`Engine.IO Connection Error:
        Code: ${err.code}
        Message: ${err.message}
        Context: ${JSON.stringify(err.context)}
      `);
    });
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        throw new UnauthorizedException(
          'No se proporcionó token de autenticación',
        );
      }

      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;

      this.connectionStatusService.addUser(userId, client.id, token);
      this.logger.log(
        `Cliente autenticado y conectado: ${client.id}, UserID: ${userId}`,
      );

      // Notificar a todos que este usuario está ahora conectado
      this.broadcast('user:connected', { userId });
    } catch (error) {
      this.logger.error(
        `Autenticación fallida para cliente ${client.id}: ${error.message}`,
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
      this.logger.error(`Error en admin:disconnect_user: ${error.message}`);
      // Opcional: emitir un error de vuelta al admin
      client.emit('admin:action_error', { message: error.message });
    }
  }
}
