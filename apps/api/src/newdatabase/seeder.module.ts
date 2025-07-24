import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';
import { User } from './users/entities/user.entity';
import { Permiso } from './permisos/entities/permiso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Permiso], 'new')],
  providers: [SeederService],
  // No longer need to import UsersModule or PermisosModule here
})
export class SeederModule {}
