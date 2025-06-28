import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermisosService } from './permisos.service';
import { PermisosController } from './permisos.controller';
import { Permiso } from './entities/permiso.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permiso], 'old')], // ¡Importante! Indicador de la base de datos a la que hace referencia
  providers: [PermisosService],
  controllers: [PermisosController],
})
export class PermisosModule {}
