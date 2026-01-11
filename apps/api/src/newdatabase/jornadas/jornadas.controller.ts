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
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JornadasService, PaginatedSessionResults } from './jornadas.service';
import { UploadJornadasResponse } from '@cuadrantes/shared-dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('jornadas')
@UseGuards(JwtAuthGuard)
export class JornadasController {
  constructor(private readonly jornadasService: JornadasService) {}

  @Get()
  async findAll() {
    console.log('findAll');
    return this.jornadasService.findAllSessions();
  }

  @Post('upload')
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

    const userId = req.user?.userId;

    const result = await this.jornadasService.procesarArchivos(
      {
        titulares: files.titulares,
        auxiliares: files.auxiliares,
        trabajadores: files.trabajadores,
        fichajes: files.fichajes,
      },
      userId,
    );

    return {
      ...result,
      message: 'Archivos procesados y casación completada correctamente.',
      data: [], // Devolvemos array vacío por defecto, los datos se pueden consultar en otro endpoint
    };
  }

  @Get(':sessionId')
  async getSessionResults(
    @Param('sessionId') sessionId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
  ): Promise<PaginatedSessionResults> {
    return this.jornadasService.getSessionResults(
      +sessionId,
      +page,
      +limit,
      search,
    );
  }

  @Delete(':id')
  async deleteSession(@Param('id') id: string) {
    return this.jornadasService.deleteSession(+id);
  }

  @Get(':sessionId/export')
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
