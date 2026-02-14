import { Injectable } from '@nestjs/common';
import { DatabaseStatusService } from './status/database-status.service';
import { MailService } from './mail/mail.service';
// import { ApiStatusResponse } from '@cuadrantes/shared-dto';

@Injectable()
export class AppService {
  constructor(
    private readonly dbStatusService: DatabaseStatusService,
    private readonly mailService: MailService,
  ) {}

  getApiStatus() {
    const databaseStatus = this.dbStatusService.getStatuses();

    return {
      welcomeMessage: 'Bienvenido al servidor de la API de Gestión',
      databaseStatus,
    };
  }

  async testEmailConnection() {
    return await this.mailService.testConnection();
  }
}
