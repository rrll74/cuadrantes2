import { Request, Response } from 'express';
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Res,
  StreamableFile,
  UseGuards,
  Req,
  Query,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JornadasService, PaginatedSessionResults } from './jornadas.service';
import { UploadJornadasResponse, PERMISSIONS } from '@cuadrantes/shared-dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { HasPermissions } from '../../auth/decorators/permissions.decorator';
import { EstadoPresencia } from './entities/presence-result.entity';

@Controller('jornadas')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class JornadasController {
  constructor(private readonly jornadasService: JornadasService) {}

  @Get()
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async findAll() {
    console.log('findAll');
    return this.jornadasService.findAllSessions();
  }

  @Post('upload')
  @HasPermissions(PERMISSIONS.JORNADAS_WRITE)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'titulares', maxCount: 1 },
      { name: 'auxiliares', maxCount: 1 },
      { name: 'trabajadores', maxCount: 1 },
      { name: 'fichajes', maxCount: 1 },
    ]),
  )
  async uploadFiles(
    @UploadedFiles()
    files: {
      titulares?: Express.Multer.File[];
      auxiliares?: Express.Multer.File[];
      trabajadores?: Express.Multer.File[];
      fichajes?: Express.Multer.File[];
    },
    @Body() body: { monthInfo?: string },
    @Req() req: Request & { user: { userId: number } },
  ): Promise<UploadJornadasResponse> {
    // Validación básica de presencia de archivos
    if (
      !files.titulares?.[0] ||
      !files.auxiliares?.[0] ||
      !files.trabajadores?.[0] ||
      !files.fichajes?.[0]
    ) {
      throw new BadRequestException(
        'Faltan archivos requeridos. Asegúrate de enviar: titulares, auxiliares, trabajadores y fichajes.',
      );
    }

    if (
      files.titulares?.[0]?.size === 0 ||
      files.auxiliares?.[0]?.size === 0 ||
      files.trabajadores?.[0]?.size === 0 ||
      files.fichajes?.[0]?.size === 0
    ) {
      throw new BadRequestException(
        'Uno o más archivos subidos están vacíos (0 bytes).',
      );
    }

    const userId = req.user?.userId;

    const result = await this.jornadasService.procesarArchivos(
      {
        titulares: files.titulares,
        auxiliares: files.auxiliares,
        trabajadores: files.trabajadores,
        fichajes: files.fichajes,
      },
      userId,
      body.monthInfo,
    );

    return {
      ...result,
      message: 'Archivos procesados y casación completada correctamente.',
      data: [], // Devolvemos array vacío por defecto, los datos se pueden consultar en otro endpoint
    };
  }

  @Get(':sessionId')
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async getSessionResults(
    @Param('sessionId') sessionId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('status') status?: EstadoPresencia,
    @Query('discounted') discounted?: string,
  ): Promise<PaginatedSessionResults> {
    return this.jornadasService.getSessionResults(
      +sessionId,
      +page,
      +limit,
      search,
      status,
      discounted,
    );
  }

  @Get(':sessionId/unmatched')
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async getUnmatchedResults(
    @Param('sessionId') sessionId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('status') status?: EstadoPresencia,
  ) {
    return this.jornadasService.getUnmatchedResults(
      +sessionId,
      +page,
      +limit,
      search,
      status,
    );
  }

  @Get(':sessionId/unmatched/stats')
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async getUnmatchedStats(@Param('sessionId') sessionId: string) {
    return this.jornadasService.getUnmatchedStats(+sessionId);
  }

  @Get(':sessionId/table-detail')
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async getTableDetail(@Param('sessionId') sessionId: string) {
    return this.jornadasService.getJornadasTableDetail(+sessionId);
  }

  @Get(':sessionId/service-summary')
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async getServiceSummary(@Param('sessionId') sessionId: string) {
    return this.jornadasService.getJornadasByServiceSummary(+sessionId);
  }

  @Get(':sessionId/equal-puesto-summary')
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async getEqualPuestoSummary(@Param('sessionId') sessionId: string) {
    return this.jornadasService.getJornadasByEqualAndPuestoSummary(+sessionId);
  }

  @Get(':sessionId/status-parts-summary')
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async getStatusPartsSummary(@Param('sessionId') sessionId: string) {
    return this.jornadasService.getJornadasByStatusAndPartsSummary(+sessionId);
  }

  @Delete(':id')
  @HasPermissions(PERMISSIONS.JORNADAS_WRITE)
  async deleteSession(@Param('id') id: string) {
    return this.jornadasService.deleteSession(+id);
  }

  @Get(':sessionId/export')
  @HasPermissions(PERMISSIONS.JORNADAS_READ)
  async exportSession(
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const buffer = await this.jornadasService.generateExcelExport(+sessionId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="jornadas_${sessionId}.xlsx"`,
      'Content-Length': buffer.length,
    });

    return new StreamableFile(buffer);
  }
}
