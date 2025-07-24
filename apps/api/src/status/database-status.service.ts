import { Injectable, Logger } from '@nestjs/common';
import { HealthStatus } from '@cuadrantes/shared-dto';

@Injectable()
export class DatabaseStatusService {
  private readonly logger = new Logger(DatabaseStatusService.name);
  private newDbStatus: HealthStatus = { status: 'pending' };
  private oldDbStatus: HealthStatus = { status: 'pending' };

  setNewDbStatus(status: 'ok' | 'error', message?: string) {
    this.newDbStatus = { status, message };
    if (status === 'ok') {
      this.logger.log('✅ Connection to NEW database successful.');
    } else {
      this.logger.error(`❌ Error connecting to NEW database: ${message}`);
    }
  }

  setOldDbStatus(status: 'ok' | 'error', message?: string) {
    this.oldDbStatus = { status, message };
    if (status === 'ok') {
      this.logger.log('✅ Connection to OLD database successful.');
    } else {
      this.logger.error(`❌ Error connecting to OLD database: ${message}`);
    }
  }

  getStatuses() {
    return {
      new: this.newDbStatus,
      old: this.oldDbStatus,
    };
  }
}
