import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConnectionStatusService } from './connection-status.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*', // En producción, deberías restringir esto a tu dominio del frontend
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
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
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

      this.connectionStatusService.addUser(userId, client.id);
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
}
