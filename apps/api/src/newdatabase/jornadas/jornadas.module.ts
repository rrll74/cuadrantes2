import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JornadasService } from './jornadas.service';
import { JornadasController } from './jornadas.controller';
import { ImportSession } from './entities/import-session.entity';
import { ScheduledRoute } from './entities/scheduled-route.entity';
import { RawWorker } from './entities/raw-worker.entity';
import { RawClockIn } from './entities/raw-clock-in.entity';
import { PresenceResult } from './entities/presence-result.entity';
import { UnmatchedResult } from './entities/unmatched-result.entity';
import { JornadasParserService } from './services/jornadas-parser.service';
import { JornadasMatchingService } from './services/jornadas-matcher.service';
import { JornadasExportService } from './services/jornadas-export.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Define la ruta de destino (ej: raíz del proyecto / uploads)
          const uploadPath = join(process.cwd(), 'uploads');

          // Verificación y creación automática
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }

          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Generar nombre único para evitar colisiones
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const extension = file.originalname.split('.').pop();
          cb(null, `${file.fieldname}-${uniqueSuffix}.${extension}`);
        },
      }),
    }),
    TypeOrmModule.forFeature(
      [
        ImportSession,
        ScheduledRoute,
        RawWorker,
        RawClockIn,
        PresenceResult,
        UnmatchedResult,
      ],
      'new',
    ),
  ],
  controllers: [JornadasController],
  providers: [
    JornadasService,
    JornadasParserService,
    JornadasMatchingService,
    JornadasExportService,
  ],
  exports: [JornadasService],
})
export class JornadasModule {}
