import { Module } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { UsersModule } from './users/users.module';
import { PermisosModule } from './permisos/permisos.module';

@Module({
  providers: [SeederService],
  imports: [UsersModule, PermisosModule],
})
export class SeederModule {}
