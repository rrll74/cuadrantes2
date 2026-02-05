import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OldDepartamentosService } from './olddepartamentos.service';
import { OldDepartamentosController } from './olddepartamentos.controller';
import { OldDepartamento } from './entities/olddepartamento.entity';

@Module({
  controllers: [OldDepartamentosController],
  providers: [OldDepartamentosService],
  imports: [TypeOrmModule.forFeature([OldDepartamento], 'old')],
})
export class OldDepartamentosModule {}
