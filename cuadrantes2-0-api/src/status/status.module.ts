import { forwardRef, Module } from '@nestjs/common';
import { StatusGateway } from './status.gateway';
import { ConnectionStatusService } from './connection-status.service';
import { AuthModule } from '@/auth/auth.module';

@Module({
  // Importamos AuthModule para tener acceso a JwtService
  // Usamos forwardRef para evitar dependencias circulares si AuthModule necesitara StatusModule
  imports: [forwardRef(() => AuthModule)],
  providers: [StatusGateway, ConnectionStatusService],
  exports: [StatusGateway, ConnectionStatusService],
})
export class StatusModule {}
