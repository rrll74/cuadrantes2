import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OldUsersService } from './oldusers.service';
import { OldUsersController } from './oldusers.controller';
import { OldUser } from './entities/olduser.entity';

@Module({
  controllers: [OldUsersController],
  providers: [OldUsersService],
  imports: [TypeOrmModule.forFeature([OldUser], 'old')], // Registra la entidad User en este módulo e indicador de la base de datos de referencia
})
export class OldUsersModule {}
