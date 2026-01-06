import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JornadasService } from './jornadas.service';
import { JornadasController } from './jornadas.controller';
import { ImportSession } from '../newdatabase/jornadas/entities/import-session.entity';
import { ScheduledRoute } from '../newdatabase/jornadas/entities/scheduled-route.entity';
import { RawWorker } from '../newdatabase/jornadas/entities/raw-worker.entity';
import { RawClockIn } from '../newdatabase/jornadas/entities/raw-clock-in.entity';
import { PresenceResult } from '../newdatabase/jornadas/entities/presence-result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImportSession,
      ScheduledRoute,
      RawWorker,
      RawClockIn,
      PresenceResult,
    ]),
  ],
  controllers: [JornadasController],
  providers: [JornadasService],
  exports: [JornadasService],
})
export class JornadasModule {}
