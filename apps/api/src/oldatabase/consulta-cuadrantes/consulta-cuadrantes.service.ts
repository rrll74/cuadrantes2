/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import PDFDocument from 'pdfkit';
import { OldEmpleado } from '@/oldatabase/empleados/entities/oldempleado.entity';
import { OldDepartamento } from '@/oldatabase/departamentos/entities/olddepartamento.entity';
import { OldCuadrante } from '@/oldatabase/cuadrantes/entities/oldcuadrante.entity';
import { OldCuadranteEmpleado } from '@/oldatabase/cuadrantes-empleados/entities/oldcuadrante-empleado.entity';
import { OldAsignacion } from '@/oldatabase/asignaciones/entities/oldasignacion.entity';
import { OldEstado } from '@/oldatabase/estados/entities/oldestado.entity';
import { OldPuesto } from '@/oldatabase/puestos/entities/oldpuesto.entity';
import { OldContrato } from '@/oldatabase/contratos/entities/oldcontrato.entity';
import {
  EmpleadoSimpleDto,
  CuadranteDisponibleDto,
  ConsultaCuadranteResponseDto,
  MesAsignacionesDto,
  AsignacionDiaDto,
  EstadoTrabajoDto,
  NOMBRES_MESES,
} from '@cuadrantes/shared-dto';

@Injectable()
export class ConsultaCuadrantesService {
  private readonly logger = new Logger(ConsultaCuadrantesService.name);

  constructor(
    @InjectRepository(OldEmpleado, 'old')
    private readonly empleadoRepository: Repository<OldEmpleado>,
    @InjectRepository(OldDepartamento, 'old')
    private readonly departamentoRepository: Repository<OldDepartamento>,
    @InjectRepository(OldCuadrante, 'old')
    private readonly cuadranteRepository: Repository<OldCuadrante>,
    @InjectRepository(OldCuadranteEmpleado, 'old')
    private readonly cuadranteEmpleadoRepository: Repository<OldCuadranteEmpleado>,
    @InjectRepository(OldAsignacion, 'old')
    private readonly asignacionRepository: Repository<OldAsignacion>,
    @InjectRepository(OldEstado, 'old')
    private readonly estadoRepository: Repository<OldEstado>,
    @InjectRepository(OldPuesto, 'old')
    private readonly puestoRepository: Repository<OldPuesto>,
    @InjectRepository(OldContrato, 'old')
    private readonly contratoRepository: Repository<OldContrato>,
  ) {}

  /**
   * Obtiene todos los empleados activos ordenados por nombre
   */
  async obtenerEmpleados(): Promise<EmpleadoSimpleDto[]> {
    this.logger.log('Obteniendo lista de empleados activos');
    const empleados = await this.empleadoRepository.find({
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
  async obtenerCuadrantesDisponibles(
    empleadoId: number,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
  ): Promise<CuadranteDisponibleDto[]> {
    this.logger.log(
      `Obteniendo cuadrantes disponibles para empleado ${empleadoId} desde ${mesInicio}/${anioInicio} hasta ${mesFin}/${anioFin}`,
    );

    // Crear fechas de inicio y fin del periodo
    const fechaInicio = new Date(anioInicio, mesInicio - 1, 1);
    const fechaFin = new Date(anioFin, mesFin, 0); // Último día del mes

    // 1. Obtener contratos del empleado que se solapen con el periodo
    const contratos = await this.contratoRepository.find({
      where: {
        empleado_id: empleadoId,
      },
    });

    // Filtrar contratos que se solapen con el periodo
    const contratosEnPeriodo = contratos.filter((contrato) => {
      const inicioCon = contrato.comienzo ? new Date(contrato.comienzo) : null;
      const finCon = contrato.fin ? new Date(contrato.fin) : null;

      if (!inicioCon) return false;

      // Comprobar solapamiento
      if (finCon) {
        return inicioCon <= fechaFin && finCon >= fechaInicio;
      } else {
        return inicioCon <= fechaFin;
      }
    });

    if (contratosEnPeriodo.length === 0) {
      this.logger.warn(
        `No se encontraron contratos para el empleado ${empleadoId} en el periodo especificado`,
      );
      return [];
    }

    const contratoIds = contratosEnPeriodo.map((c) => c.id);

    // 2. Obtener puestos asociados a esos contratos
    const puestos = await this.puestoRepository.find({
      where: {
        contrato_id: In(contratoIds),
      },
    });

    // Filtrar puestos que se solapen con el periodo
    const puestosEnPeriodo = puestos.filter((puesto) => {
      const inicioPuesto = new Date(puesto.comienzo_c);
      const finPuesto = puesto.fin_c ? new Date(puesto.fin_c) : null;

      if (finPuesto) {
        return inicioPuesto <= fechaFin && finPuesto >= fechaInicio;
      } else {
        return inicioPuesto <= fechaFin;
      }
    });

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

    // 4. Obtener cuadrantes de esos departamentos donde el empleado esté asignado
    const cuadrantesEmpleado = await this.cuadranteEmpleadoRepository.find({
      where: {
        empleado_id: empleadoId,
        visible: true,
      },
    });

    const cuadranteIds = cuadrantesEmpleado.map((ce) => ce.cuadrante_id);

    if (cuadranteIds.length === 0) {
      this.logger.warn(
        `No se encontraron asignaciones a cuadrantes para el empleado ${empleadoId}`,
      );
      return [];
    }

    // 5. Obtener cuadrantes que pertenezcan a los departamentos y estén en cuadranteIds
    const cuadrantes = await this.cuadranteRepository.find({
      where: {
        id: In(cuadranteIds),
        departamento_id: In(departamentoIds),
        visible: true,
      },
      order: { nombre: 'ASC' },
    });

    // 6. Obtener información de departamentos
    const departamentos = await this.departamentoRepository.find({
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
   * Obtiene la consulta completa de asignaciones para un empleado en un cuadrante y periodo
   */
  async obtenerConsultaCuadrante(
    empleadoId: number,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    cuadranteId: number,
    tipoInicial: boolean,
  ): Promise<ConsultaCuadranteResponseDto> {
    this.logger.log(
      `Obteniendo consulta de cuadrante para empleado ${empleadoId}, cuadrante ${cuadranteId}, periodo ${mesInicio}/${anioInicio} - ${mesFin}/${anioFin}, tipo: ${tipoInicial ? 'inicial' : 'modificado'}`,
    );

    // 1. Obtener empleado
    const empleado = await this.empleadoRepository.findOne({
      where: { id: empleadoId },
    });
    if (!empleado) {
      throw new NotFoundException(
        `Empleado con ID ${empleadoId} no encontrado`,
      );
    }

    // 2. Obtener cuadrante
    const cuadrante = await this.cuadranteRepository.findOne({
      where: { id: cuadranteId },
    });
    if (!cuadrante) {
      throw new NotFoundException(
        `Cuadrante con ID ${cuadranteId} no encontrado`,
      );
    }

    // 3. Obtener departamento
    const departamento = await this.departamentoRepository.findOne({
      where: { id: cuadrante.departamento_id },
    });

    // 4. Obtener asignaciones del periodo
    const fechaInicio = new Date(anioInicio, mesInicio - 1, 1);
    const fechaFin = new Date(anioFin, mesFin, 0);

    const asignaciones = await this.asignacionRepository.find({
      where: {
        empleado_id: empleadoId,
        cuadrante_id: cuadranteId,
        ini0_mod1: tipoInicial ? false : true, // 0 = inicial, 1 = modificado
        fecha: Between(fechaInicio, fechaFin),
      },
      order: { fecha: 'ASC' },
    });

    // 5. Obtener todos los estados únicos usados en las asignaciones
    const estadoIds = [...new Set(asignaciones.map((a) => a.estado_id))].filter(
      (id) => id !== null && id !== undefined,
    );

    const estados = await this.estadoRepository.find({
      where: {
        id: In(estadoIds),
        visible: true,
      },
    });

    const estadosMap = new Map(estados.map((e) => [e.id, e]));

    // 6. Construir meses
    const meses = this.construirMeses(
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      asignaciones,
      estadosMap,
    );

    // 7. Construir DTOs de estados
    const estadosUsados = estados.map((estado) => this.mapEstadoToDto(estado));

    return {
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        nif: empleado.nif,
        email: empleado.email,
      },
      cuadrante: {
        id: cuadrante.id,
        nombre: cuadrante.nombre,
        departamentoId: cuadrante.departamento_id,
        departamentoNombre: departamento?.nombre || 'Desconocido',
        guardia: cuadrante.guardia,
      },
      meses,
      estadosUsados,
      tipoInicial,
    };
  }

  /**
   * Construye el array de meses con asignaciones
   */
  private construirMeses(
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    asignaciones: OldAsignacion[],
    estadosMap: Map<number, OldEstado>,
  ): MesAsignacionesDto[] {
    const meses: MesAsignacionesDto[] = [];

    // Crear mapa de asignaciones por fecha
    const asignacionesMap = new Map<string, OldAsignacion>();
    asignaciones.forEach((asig) => {
      const fecha = new Date(asig.fecha);
      const key = `${fecha.getFullYear()}-${fecha.getMonth() + 1}-${fecha.getDate()}`;
      asignacionesMap.set(key, asig);
    });

    // Iterar por todos los meses del periodo
    let mesActual = mesInicio;
    let anioActual = anioInicio;

    while (
      anioActual < anioFin ||
      (anioActual === anioFin && mesActual <= mesFin)
    ) {
      // Determinar cuántos días tiene este mes
      const diasEnMes = new Date(anioActual, mesActual, 0).getDate();

      // Crear array de 31 elementos (para todos los días posibles)
      const asignacionesMes: (AsignacionDiaDto | null)[] = Array(31).fill(null);

      // Rellenar con asignaciones reales
      for (let dia = 1; dia <= diasEnMes; dia++) {
        const key = `${anioActual}-${mesActual}-${dia}`;
        const asignacion = asignacionesMap.get(key);

        if (asignacion) {
          const estado = estadosMap.get(asignacion.estado_id);
          asignacionesMes[dia - 1] = {
            dia,
            mes: mesActual,
            anio: anioActual,
            estadoId: asignacion.estado_id,
            abreviatura: estado?.abreviatura || '',
            colortexto: estado?.colortexto,
            colorfondo: estado?.colorfondo,
            horainicio: asignacion.horaini || estado?.horainicio,
            horafin: asignacion.horafin || estado?.horafin,
            descripEstado: estado?.descrip,
          };
        }
      }

      meses.push({
        mes: mesActual,
        anio: anioActual,
        mesNombre: NOMBRES_MESES[mesActual - 1],
        asignaciones: asignacionesMes,
      });

      // Avanzar al siguiente mes
      mesActual++;
      if (mesActual > 12) {
        mesActual = 1;
        anioActual++;
      }
    }

    return meses;
  }

  /**
   * Mapea una entidad estado a DTO
   */
  private mapEstadoToDto(estado: OldEstado): EstadoTrabajoDto {
    return {
      id: estado.id,
      abreviatura: estado.abreviatura,
      descrip: estado.descrip,
      trab1_desc0: estado.trab1_desc0,
      colortexto: estado.colortexto,
      colorfondo: estado.colorfondo,
      horainicio: estado.horainicio,
      horafin: estado.horafin,
    };
  }

  /**
   * Genera un PDF con los datos de la consulta
   */
  async generarPDF(
    empleadoId: number,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    cuadranteId: number,
    tipoInicial: boolean,
  ): Promise<Buffer> {
    this.logger.log('Generando PDF para la consulta de cuadrante');

    // Obtener datos de la consulta
    const datos = await this.obtenerConsultaCuadrante(
      empleadoId,
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      cuadranteId,
      tipoInicial,
    );

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 30,
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Título
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Consulta de Cuadrante', { align: 'center' });
      doc.moveDown(0.5);

      // Información del empleado y cuadrante
      doc.fontSize(12).font('Helvetica');
      doc.text(`Empleado: ${datos.empleado.nombre}`, { continued: true });
      doc.text(`     Cuadrante: ${datos.cuadrante.nombre}`);
      doc.text(`Departamento: ${datos.cuadrante.departamentoNombre}`, {
        continued: true,
      });
      doc.text(`     Tipo: ${tipoInicial ? 'Inicial' : 'Modificado'}`);
      doc.text(
        `Periodo: ${NOMBRES_MESES[mesInicio - 1]} ${anioInicio} - ${NOMBRES_MESES[mesFin - 1]} ${anioFin}`,
      );
      doc.moveDown(1);

      // Tabla de asignaciones
      const cellWidth = 22;
      const cellHeight = 30;
      const startX = 40;
      let startY = doc.y;

      // Iterar por cada mes
      datos.meses.forEach((mes, mesIndex) => {
        if (mesIndex > 0 && mesIndex % 3 === 0) {
          // Nueva página cada 3 meses para mantener legibilidad
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
          startY = 50;
        }

        const rowY = startY + Math.floor(mesIndex % 3) * (cellHeight * 2 + 40);

        // Nombre del mes
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`${mes.mesNombre} ${mes.anio}`, startX, rowY);

        // Encabezados de días (1-31)
        doc.fontSize(7).font('Helvetica');
        for (let dia = 1; dia <= 31; dia++) {
          const x = startX + (dia - 1) * cellWidth;
          doc.text(dia.toString(), x, rowY + 15, {
            width: cellWidth,
            align: 'center',
          });
        }

        // Células de asignaciones
        for (let dia = 1; dia <= 31; dia++) {
          const x = startX + (dia - 1) * cellWidth;
          const y = rowY + 25;

          // Dibujar borde de celda
          doc.rect(x, y, cellWidth, cellHeight).stroke();

          const asig = mes.asignaciones[dia - 1];
          if (asig) {
            // Convertir color numérico a hex
            const colorFondo = this.convertirColorToHex(
              (asig.colorfondo as number) || 0,
            );
            const colorTexto = this.convertirColorToHex(
              (asig.colortexto as number) || 0,
            );

            // Rellenar fondo
            doc
              .rect(x + 1, y + 1, cellWidth - 2, cellHeight - 2)
              .fill(colorFondo);

            // Texto (abreviatura)
            doc.fillColor(colorTexto).fontSize(8).font('Helvetica-Bold');
            doc.text(asig.abreviatura || '', x, y + 10, {
              width: cellWidth,
              align: 'center',
            });

            // Resetear color
            doc.fillColor('black');
          }
        }
      });

      // Leyenda en nueva página
      doc.addPage({ size: 'A4', margin: 50 });
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Leyenda de Estados', { align: 'center' });
      doc.moveDown(1);

      // Tabla de leyenda
      doc.fontSize(10).font('Helvetica-Bold');
      const legendY = doc.y;
      const colWidths = [60, 150, 100, 100];
      let currentY = legendY;

      // Encabezados
      doc.text('Abrev.', 50, currentY, { width: colWidths[0] });
      doc.text('Descripción', 110, currentY, { width: colWidths[1] });
      doc.text('Horario', 260, currentY, { width: colWidths[2] });
      doc.text('', 360, currentY, { width: colWidths[3] }); // Columna de color

      currentY += 20;

      // Línea separadora
      doc.moveTo(50, currentY).lineTo(500, currentY).stroke();
      currentY += 10;

      // Estados
      doc.font('Helvetica');
      datos.estadosUsados.forEach((estado) => {
        const colorFondo = this.convertirColorToHex(
          typeof estado.colorfondo === 'number' ? estado.colorfondo : 0,
        );
        const colorTexto = this.convertirColorToHex(
          typeof estado.colortexto === 'number' ? estado.colortexto : 0,
        );

        // Cuadro de ejemplo con colores
        doc.rect(50, currentY, 50, 20).fill(colorFondo);
        doc.fillColor(colorTexto).fontSize(9);
        doc.text(estado.abreviatura, 50, currentY + 5, {
          width: 50,
          align: 'center',
        });

        // Resto de información
        doc.fillColor('black');
        doc.text(estado.descrip || '', 110, currentY + 5, {
          width: colWidths[1],
        });

        const horario =
          estado.horainicio && estado.horafin
            ? `${estado.horainicio} - ${estado.horafin}`
            : 'N/A';
        doc.text(horario, 260, currentY + 5, { width: colWidths[2] });

        currentY += 25;
      });

      doc.end();
    });
  }

  /**
   * Convierte un color numérico (RGB como entero) a formato hexadecimal
   */
  private convertirColorToHex(colorNum: number): string {
    if (!colorNum && colorNum !== 0) return '#FFFFFF';
    const hex = colorNum.toString(16).padStart(6, '0');
    return `#${hex}`;
  }

  /**
   * Genera un PDF y lo envía por email al empleado
   * Nota: Requiere configuración de nodemailer con credenciales SMTP
   */
  async generarYEnviarPDF(
    empleadoId: number,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
    cuadranteId: number,
    tipoInicial: boolean,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Generando y enviando PDF por email al empleado ${empleadoId}`,
    );

    // Generar PDF
    // const pdfBuffer =
    await this.generarPDF(
      empleadoId,
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      cuadranteId,
      tipoInicial,
    );

    // Obtener empleado para verificar email
    const empleado = await this.empleadoRepository.findOne({
      where: { id: empleadoId },
    });

    if (!empleado || !empleado.email) {
      throw new NotFoundException(`El empleado no tiene email configurado`);
    }

    // TODO: Implementar envío de email con nodemailer
    // Por ahora, retornamos un mensaje indicando que se debe configurar nodemailer
    this.logger.warn(
      'El envío de email no está implementado. Configure nodemailer con credenciales SMTP.',
    );

    return {
      success: false,
      message:
        'La generación de PDF fue exitosa, pero el envío de email requiere configuración de nodemailer. Por favor, configure las credenciales SMTP.',
    };
  }
}
