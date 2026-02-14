import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultaCuadrantesController } from './consulta-cuadrantes.controller';
import { ConsultaCuadrantesService } from './consulta-cuadrantes.service';
import { OldEmpleado } from '@/oldatabase/empleados/entities/oldempleado.entity';
import { OldDepartamento } from '@/oldatabase/departamentos/entities/olddepartamento.entity';
import { OldCuadrante } from '@/oldatabase/cuadrantes/entities/oldcuadrante.entity';
import { OldCuadranteEmpleado } from '@/oldatabase/cuadrantes-empleados/entities/oldcuadrante-empleado.entity';
import { OldAsignacion } from '@/oldatabase/asignaciones/entities/oldasignacion.entity';
import { OldEstado } from '@/oldatabase/estados/entities/oldestado.entity';
import { OldPuesto } from '@/oldatabase/puestos/entities/oldpuesto.entity';
import { OldContrato } from '@/oldatabase/contratos/entities/oldcontrato.entity';
import { MailModule } from '@/mail/mail.module';

@Module({
  controllers: [ConsultaCuadrantesController],
  providers: [ConsultaCuadrantesService],
  imports: [
    TypeOrmModule.forFeature(
      [
        OldEmpleado,
        OldDepartamento,
        OldCuadrante,
        OldCuadranteEmpleado,
        OldAsignacion,
        OldEstado,
        OldPuesto,
        OldContrato,
      ],
      'old',
    ),
    MailModule,
  ],
})
export class ConsultaCuadrantesModule {}
