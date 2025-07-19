import { Injectable } from '@nestjs/common';

@Injectable()
export class ConnectionStatusService {
  // Mapea userId -> { socketId }
  private readonly connectedUsers = new Map<number, { socketId: string }>();

  addUser(userId: number, socketId: string) {
    this.connectedUsers.set(userId, { socketId });
  }

  removeUserBySocketId(socketId: string): number | undefined {
    let userIdToRemove: number | undefined;
    for (const [userId, connection] of this.connectedUsers.entries()) {
      if (connection.socketId === socketId) {
        userIdToRemove = userId;
        break;
      }
    }

    if (userIdToRemove) {
      this.connectedUsers.delete(userIdToRemove);
    }
    return userIdToRemove;
  }

  isUserConnected(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }
}
