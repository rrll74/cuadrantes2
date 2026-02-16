import { In, Repository } from 'typeorm';
import { OldEmpleado } from '@/oldatabase/empleados/entities/oldempleado.entity';
import { OldDepartamento } from '@/oldatabase/departamentos/entities/olddepartamento.entity';
import { OldCuadrante } from '@/oldatabase/cuadrantes/entities/oldcuadrante.entity';
import { OldCuadranteEmpleado } from '@/oldatabase/cuadrantes-empleados/entities/oldcuadrante-empleado.entity';
import { OldPuesto } from '@/oldatabase/puestos/entities/oldpuesto.entity';
import { OldContrato } from '@/oldatabase/contratos/entities/oldcontrato.entity';
import {
  EmpleadoSimpleDto,
  CuadranteDisponibleDto,
} from '@cuadrantes/shared-dto';
import { Logger } from '@nestjs/common';

/**
 * Helper para obtener información de empleados y cuadrantes disponibles
 */
export class EmpleadoCuadrantesHelper {
  private static readonly logger = new Logger(EmpleadoCuadrantesHelper.name);

  /**
   * Obtiene todos los empleados activos ordenados por nombre
   */
  static async obtenerEmpleados(
    empleadoRepository: Repository<OldEmpleado>,
  ): Promise<EmpleadoSimpleDto[]> {
    this.logger.log('Obteniendo lista de empleados activos');
    const empleados = await empleadoRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
      select: ['id', 'nombre', 'nif', 'email'],
    });

    return empleados.map((emp) => ({
      id: emp.id,
      nombre: emp.nombre,
      nif: emp.nif,
      email: emp.email,
    }));
  }

  /**
   * Obtiene los cuadrantes disponibles para un empleado en un periodo dado
   * basándose en los puestos de trabajo que ocupó en ese periodo
   */
  static async obtenerCuadrantesDisponibles(
    empleadoId: number,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    empleadoRepository: Repository<OldEmpleado>,
    cuadranteRepository: Repository<OldCuadrante>,
    cuadranteEmpleadoRepository: Repository<OldCuadranteEmpleado>,
    departamentoRepository: Repository<OldDepartamento>,
    puestoRepository: Repository<OldPuesto>,
    contratoRepository: Repository<OldContrato>,
  ): Promise<CuadranteDisponibleDto[]> {
    this.logger.log(
      `Obteniendo cuadrantes disponibles para empleado ${empleadoId} desde ${mesInicio}/${anioInicio} hasta ${mesFin}/${anioFin}`,
    );

    // Crear fechas de inicio y fin del periodo
    const fechaInicio = new Date(anioInicio, mesInicio - 1, 1);
    const fechaFin = new Date(anioFin, mesFin, 0); // Último día del mes

    // 1. Obtener contratos del empleado que se solapen con el periodo
    const contratosEnPeriodo = await this.obtenerContratosEnPeriodo(
      empleadoId,
      contratoRepository,
      fechaInicio,
      fechaFin,
    );

    if (contratosEnPeriodo.length === 0) {
      this.logger.warn(
        `No se encontraron contratos para el empleado ${empleadoId} en el periodo especificado`,
      );
      return [];
    }

    const contratoIds = contratosEnPeriodo.map((c) => c.id);

    // 2. Obtener puestos en periodo
    const puestosEnPeriodo = await this.obtenerPuestosEnPeriodo(
      contratoIds,
      puestoRepository,
      fechaInicio,
      fechaFin,
    );

    if (puestosEnPeriodo.length === 0) {
      this.logger.warn(
        `No se encontraron puestos para el empleado ${empleadoId} en el periodo especificado`,
      );
      return [];
    }

    // 3. Obtener departamentos únicos de esos puestos
    const departamentoIds = [
      ...new Set(puestosEnPeriodo.map((p) => p.departamento_id)),
    ];

    // 4. Obtener cuadrantes asignados al empleado
    const cuadranteIds = await this.obtenerCuadrantesAsignadosAlEmpleado(
      empleadoId,
      cuadranteEmpleadoRepository,
    );

    if (cuadranteIds.length === 0) {
      this.logger.warn(
        `No se encontraron asignaciones a cuadrantes para el empleado ${empleadoId}`,
      );
      return [];
    }

    // 5. Obtener cuadrantes que pertenezcan a los departamentos
    const cuadrantes = await cuadranteRepository.find({
      where: {
        id: In(cuadranteIds),
        departamento_id: In(departamentoIds),
        visible: true,
      },
      order: { nombre: 'ASC' },
    });

    // 6. Obtener información de departamentos
    const departamentos = await departamentoRepository.find({
      where: {
        id: In(departamentoIds),
      },
    });

    const departamentosMap = new Map(departamentos.map((d) => [d.id, d]));

    // 7. Construir resultado
    return cuadrantes.map((cuadrante) => {
      const depto = departamentosMap.get(cuadrante.departamento_id);
      return {
        id: cuadrante.id,
        nombre: cuadrante.nombre,
        departamentoId: cuadrante.departamento_id,
        departamentoNombre: depto?.nombre || 'Desconocido',
        guardia: cuadrante.guardia,
      };
    });
  }

  /**
   * Obtiene los contratos que se solapan con el periodo especificado
   */
  private static obtenerContratosEnPeriodo(
    empleadoId: number,
    contratoRepository: Repository<OldContrato>,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<OldContrato[]> {
    return contratoRepository
      .find({
        where: {
          empleado_id: empleadoId,
        },
      })
      .then((contratos) =>
        contratos.filter((contrato) => {
          const inicioCon = contrato.comienzo
            ? new Date(contrato.comienzo)
            : null;
          const finCon = contrato.fin ? new Date(contrato.fin) : null;

          if (!inicioCon) return false;

          // Comprobar solapamiento
          if (finCon) {
            return inicioCon <= fechaFin && finCon >= fechaInicio;
          } else {
            return inicioCon <= fechaFin;
          }
        }),
      );
  }

  /**
   * Obtiene los puestos que se solapan con el periodo especificado
   */
  private static async obtenerPuestosEnPeriodo(
    contratoIds: number[],
    puestoRepository: Repository<OldPuesto>,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<OldPuesto[]> {
    const puestos = await puestoRepository.find({
      where: {
        contrato_id: In(contratoIds),
      },
    });

    return puestos.filter((puesto) => {
      const inicioPuesto = new Date(puesto.comienzo_c);
      const finPuesto = puesto.fin_c ? new Date(puesto.fin_c) : null;

      if (finPuesto) {
        return inicioPuesto <= fechaFin && finPuesto >= fechaInicio;
      } else {
        return inicioPuesto <= fechaFin;
      }
    });
  }

  /**
   * Obtiene los IDs de cuadrantes asignados a un empleado
   */
  private static async obtenerCuadrantesAsignadosAlEmpleado(
    empleadoId: number,
    cuadranteEmpleadoRepository: Repository<OldCuadranteEmpleado>,
  ): Promise<number[]> {
    const cuadrantesEmpleado = await cuadranteEmpleadoRepository.find({
      where: {
        empleado_id: empleadoId,
        visible: true,
      },
    });

    return cuadrantesEmpleado.map((ce) => ce.cuadrante_id);
  }
}
