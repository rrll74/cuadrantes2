import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JornadasService } from './jornadas.service';
import { JornadasController } from './jornadas.controller';
import { ImportSession } from './entities/import-session.entity';
import { ScheduledRoute } from './entities/scheduled-route.entity';
import { RawWorker } from './entities/raw-worker.entity';
import { RawClockIn } from './entities/raw-clock-in.entity';
import { PresenceResult } from './entities/presence-result.entity';
import { JornadasParserService } from './services/jornadas-parser.service';
import { JornadasMatchingService } from './services/jornadas-matcher.service';
import { JornadasExportService } from './services/jornadas-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [ImportSession, ScheduledRoute, RawWorker, RawClockIn, PresenceResult],
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
