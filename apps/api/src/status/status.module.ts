import { forwardRef, Module } from '@nestjs/common';
import { StatusGateway } from './status.gateway';
import { ConnectionStatusService } from './connection-status.service';
import { AuthModule } from '@/auth/auth.module';
import { DatabaseStatusService } from './database-status.service';
import { UsersModule } from '@/newdatabase/users/users.module';

@Module({
  // Importamos AuthModule para tener acceso a JwtService
  // Usamos forwardRef para evitar dependencias circulares si AuthModule necesitara StatusModule
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule), // Usamos forwardRef para romper el ciclo Status <-> Users
  ],
  providers: [StatusGateway, ConnectionStatusService, DatabaseStatusService],
  exports: [StatusGateway, ConnectionStatusService, DatabaseStatusService],
})
export class StatusModule {}
