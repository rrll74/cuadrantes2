import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthLockdownService {
  private isLocked = false;
  private readonly logger = new Logger(AuthLockdownService.name);

  toggleLockdown(): boolean {
    this.isLocked = !this.isLocked;
    this.logger.log(
      `El inicio de sesión de usuarios ha sido ${
        this.isLocked ? 'DESHABILITADO' : 'HABILITADO'
      }.`,
    );
    return this.isLocked;
  }

  getStatus(): { isLocked: boolean } {
    return { isLocked: this.isLocked };
  }

  isLoginLocked(): boolean {
    return this.isLocked;
  }
}
