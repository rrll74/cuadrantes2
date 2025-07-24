import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { StatusModule } from '@/status/status.module';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Permiso], 'new'),
    forwardRef(() => StatusModule), // Importamos StatusModule para acceder a sus servicios
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
