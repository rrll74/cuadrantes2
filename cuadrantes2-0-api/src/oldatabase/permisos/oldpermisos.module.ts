import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OldPermisosService } from './oldpermisos.service';
import { OldPermisosController } from './oldpermisos.controller';
import { OldPermiso } from './entities/oldpermiso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OldPermiso], 'old')], // ¡Importante! Indicador de la base de datos a la que hace referencia
  providers: [OldPermisosService],
  controllers: [OldPermisosController],
})
export class OldPermisosModule {}
