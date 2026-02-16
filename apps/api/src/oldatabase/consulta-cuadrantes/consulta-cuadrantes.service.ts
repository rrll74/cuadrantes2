import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
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
  EstadoTrabajoDto,
  NOMBRES_MESES,
} from '@cuadrantes/shared-dto';
import { MailService } from '@/mail/mail.service';
import {
  AsignacionesHelper,
  EmailGeneratorHelper,
  PdfGeneratorHelper,
  EmpleadoCuadrantesHelper,
} from './helpers';

/**
 * Servicio de Consulta de Cuadrantes
 *
 * Orquesta la lógica de negocio para:
 * - Obtener empleados y cuadrantes disponibles
 * - Generar consultas de cuadrantes con asignaciones
 * - Generar PDFs y enviarlos por email
 *
 * La responsabilidad se delega a los helpers para cada dominio específico
 */
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
    private readonly mailService: MailService,
  ) {}

  /**
   * Obtiene todos los empleados activos ordenados por nombre
   */
  async obtenerEmpleados(): Promise<EmpleadoSimpleDto[]> {
    return EmpleadoCuadrantesHelper.obtenerEmpleados(this.empleadoRepository);
  }

  /**
   * Obtiene los cuadrantes disponibles para un empleado en un periodo dado
   */
  async obtenerCuadrantesDisponibles(
    empleadoId: number,
    mesInicio: number,
    anioInicio: number,
    mesFin: number,
    anioFin: number,
  ): Promise<CuadranteDisponibleDto[]> {
    return EmpleadoCuadrantesHelper.obtenerCuadrantesDisponibles(
      empleadoId,
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      this.empleadoRepository,
      this.cuadranteRepository,
      this.cuadranteEmpleadoRepository,
      this.departamentoRepository,
      this.puestoRepository,
      this.contratoRepository,
    );
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

    // 6. Construir meses usando el helper
    const meses = AsignacionesHelper.construirMeses(
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

    return PdfGeneratorHelper.generarPDF(
      datos,
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      tipoInicial,
    );
  }

  /**
   * Genera un PDF y lo envía por email al empleado
   * Requiere configuración de variables de entorno SMTP
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

    // Verificar si el servicio de email está configurado
    if (!this.mailService.isConfigured()) {
      const errorMsg =
        'El servicio de email no está configurado. Configure las variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM';
      this.logger.warn(errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }

    // Generar PDF
    const pdfBuffer = await this.generarPDF(
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

    // Obtener datos para generar el HTML del email
    const datos = await this.obtenerConsultaCuadrante(
      empleadoId,
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      cuadranteId,
      tipoInicial,
    );

    // Generar HTML del email usando el helper
    const htmlContent = EmailGeneratorHelper.generarHtmlEmail(
      datos,
      mesInicio,
      anioInicio,
      mesFin,
      anioFin,
      tipoInicial,
    );

    // Enviar email con PDF adjunto
    const subject = `Consulta de Cuadrante: ${datos.cuadrante.nombre} (${NOMBRES_MESES[mesInicio - 1]} ${anioInicio} - ${NOMBRES_MESES[mesFin - 1]} ${anioFin})`;

    const mailResult = await this.mailService.sendMail({
      to: empleado.email,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: `consulta-cuadrante-${empleadoId}-${new Date().getTime()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (mailResult.success) {
      this.logger.log(
        `Email enviado exitosamente a ${empleado.email} (MessageId: ${mailResult.messageId})`,
      );
      return {
        success: true,
        message: `PDF generado y enviado exitosamente a ${empleado.email}`,
      };
    } else {
      this.logger.error(`Error al enviar email: ${mailResult.error}`);
      return {
        success: false,
        message: `Error al enviar email: ${mailResult.error}`,
      };
    }
  }
}
