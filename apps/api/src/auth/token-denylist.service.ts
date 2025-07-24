import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TokenDenylistService {
  private readonly denylist = new Set<string>();
  private readonly logger = new Logger(TokenDenylistService.name);

  /**
   * Adds a token to the denylist and sets a timer to remove it upon its natural expiration.
   * This prevents the denylist from growing indefinitely.
   * @param token The JWT to deny.
   * @param expiresInMs The number of milliseconds until the token expires.
   */
  deny(token: string, expiresInMs: number) {
    this.denylist.add(token);
    this.logger.log(
      `Token added to denylist. It will be removed in ${expiresInMs}ms.`,
    );
    setTimeout(() => {
      this.denylist.delete(token);
      this.logger.log('Expired token removed from denylist.');
    }, expiresInMs);
  }

  /**
   * Checks if a token is currently on the denylist.
   * @param token The JWT to check.
   * @returns `true` if the token is denied, `false` otherwise.
   */
  isDenied(token: string): boolean {
    return this.denylist.has(token);
  }
}
