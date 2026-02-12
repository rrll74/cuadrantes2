import {
  Controller,
  Get,
  Post,
  Body,
  ValidationPipe,
  Logger,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ConsultaCuadrantesService } from './consulta-cuadrantes.service';
import {
  EmpleadoSimpleDto,
  CuadranteDisponibleDto,
  ConsultaCuadranteResponseDto,
  ConsultaCuadranteRequestDto,
  CuadrantesDisponiblesRequestDto,
  PERMISSIONS,
} from '@cuadrantes/shared-dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { HasPermissions } from '@/auth/decorators/permissions.decorator';

@ApiTags('Consulta Cuadrantes (Old)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('consulta-cuadrantes')
export class ConsultaCuadrantesController {
  private readonly logger = new Logger(ConsultaCuadrantesController.name);

  constructor(
    private readonly consultaCuadrantesService: ConsultaCuadrantesService,
  ) {}

  @Get('empleados')
  @HasPermissions(PERMISSIONS.CUADRANTES_READ)
  @ApiOperation({
    summary: 'Obtener lista de empleados activos ordenados por nombre',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados activos',
  })
  async obtenerEmpleados(): Promise<EmpleadoSimpleDto[]> {
    this.logger.log('GET /consulta-cuadrantes/empleados');
    return this.consultaCuadrantesService.obtenerEmpleados();
  }

  @Post('cuadrantes-disponibles')
  @HasPermissions(PERMISSIONS.CUADRANTES_READ)
  @ApiOperation({
    summary:
      'Obtener cuadrantes disponibles para un empleado en un periodo dado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de cuadrantes disponibles',
  })
  async obtenerCuadrantesDisponibles(
    @Body(ValidationPipe) request: CuadrantesDisponiblesRequestDto,
  ): Promise<CuadranteDisponibleDto[]> {
    this.logger.log('POST /consulta-cuadrantes/cuadrantes-disponibles', {
      empleadoId: request.empleadoId,
      periodo: `${request.mesInicio}/${request.anioInicio} - ${request.mesFin}/${request.anioFin}`,
    });

    return this.consultaCuadrantesService.obtenerCuadrantesDisponibles(
      request.empleadoId,
      request.mesInicio,
      request.anioInicio,
      request.mesFin,
      request.anioFin,
    );
  }

  @Post('consultar')
  @HasPermissions(PERMISSIONS.CUADRANTES_READ)
  @ApiOperation({
    summary:
      'Obtener consulta completa de asignaciones de un empleado en un cuadrante y periodo',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos de consulta de cuadrante',
  })
  async consultarCuadrante(
    @Body(ValidationPipe) request: ConsultaCuadranteRequestDto,
  ): Promise<ConsultaCuadranteResponseDto> {
    this.logger.log('POST /consulta-cuadrantes/consultar', {
      empleadoId: request.empleadoId,
      cuadranteId: request.cuadranteId,
      periodo: `${request.mesInicio}/${request.anioInicio} - ${request.mesFin}/${request.anioFin}`,
      tipoInicial: request.tipoInicial,
    });

    return this.consultaCuadrantesService.obtenerConsultaCuadrante(
      request.empleadoId,
      request.mesInicio,
      request.anioInicio,
      request.mesFin,
      request.anioFin,
      request.cuadranteId,
      request.tipoInicial,
    );
  }

  @Post('generar-pdf')
  @HasPermissions(PERMISSIONS.CUADRANTES_READ)
  @ApiOperation({ summary: 'Generar PDF con los datos de la consulta' })
  @ApiResponse({
    status: 200,
    description: 'PDF generado correctamente',
  })
  async generarPDF(
    @Body(ValidationPipe) request: ConsultaCuadranteRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log('POST /consulta-cuadrantes/generar-pdf', {
      empleadoId: request.empleadoId,
      cuadranteId: request.cuadranteId,
    });

    const pdfBuffer = await this.consultaCuadrantesService.generarPDF(
      request.empleadoId,
      request.mesInicio,
      request.anioInicio,
      request.mesFin,
      request.anioFin,
      request.cuadranteId,
      request.tipoInicial,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="cuadrante-${request.empleadoId}-${request.cuadranteId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  @Post('enviar-pdf-email')
  @HasPermissions(PERMISSIONS.CUADRANTES_READ)
  @ApiOperation({ summary: 'Generar PDF y enviarlo por email al empleado' })
  @ApiResponse({
    status: 200,
    description: 'PDF generado y enviado por email',
  })
  async enviarPDFEmail(
    @Body(ValidationPipe) request: ConsultaCuadranteRequestDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log('POST /consulta-cuadrantes/enviar-pdf-email', {
      empleadoId: request.empleadoId,
      cuadranteId: request.cuadranteId,
    });

    return this.consultaCuadrantesService.generarYEnviarPDF(
      request.empleadoId,
      request.mesInicio,
      request.anioInicio,
      request.mesFin,
      request.anioFin,
      request.cuadranteId,
      request.tipoInicial,
    );
  }
}
