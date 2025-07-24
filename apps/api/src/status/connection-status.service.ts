import { Injectable } from '@nestjs/common';

@Injectable()
export class ConnectionStatusService {
  // Maps userId to socketId for quick lookups
  private readonly userSocketMap = new Map<
    number,
    { socketId: string; token: string }
  >();
  // Maps socketId to userId for quick lookups on disconnect
  private readonly socketUserMap = new Map<string, number>();

  addUser(userId: number, socketId: string, token: string) {
    this.userSocketMap.set(userId, { socketId, token });
    this.socketUserMap.set(socketId, userId);
  }

  removeUserBySocketId(socketId: string): number | undefined {
    const userId = this.socketUserMap.get(socketId);
    if (userId) {
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(socketId);
    }
    return userId;
  }

  getUserIdBySocketId(socketId: string): number | undefined {
    return this.socketUserMap.get(socketId);
  }

  getSocketIdByUserId(userId: number): string | undefined {
    return this.userSocketMap.get(userId)?.socketId;
  }

  getTokenByUserId(userId: number): string | undefined {
    return this.userSocketMap.get(userId)?.token;
  }

  /**
   * Checks if a user is currently connected.
   * @param userId The ID of the user to check.
   * @returns `true` if the user has an active socket connection, `false` otherwise.
   */
  isUserConnected(userId: number): boolean {
    return this.userSocketMap.has(userId);
  }
}
