import { Response } from 'express';
import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JornadasService } from './jornadas.service';
import { UploadJornadasResponse } from '@cuadrantes/shared-dto';

@Controller('jornadas')
export class JornadasController {
  constructor(private readonly jornadasService: JornadasService) {}

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

    // TODO: Obtener el ID del usuario real desde el request (AuthGuard)
    const userId = 1;

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
  async getSessionResults(@Param('sessionId') sessionId: string) {
    return this.jornadasService.getSessionResults(+sessionId);
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

  @Get()
  async findAll() {
    return this.jornadasService.findAllSessions();
  }
}
