import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getApiStatus() {
    return this.appService.getApiStatus();
  }

  @Public()
  @Get('test-email-connection')
  async testEmailConnection() {
    return await this.appService.testEmailConnection();
  }
}
