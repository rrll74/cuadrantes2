import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ImportSession } from '../../entities/import-session.entity';
import { RawWorker } from '../../entities/raw-worker.entity';
import { UnmatchedResult } from '../../entities/unmatched-result.entity';

@Injectable()
export class SessionStatsHelper {
  constructor(
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
    @InjectRepository(RawWorker, 'new')
    private workerRepo: Repository<RawWorker>,
    @InjectRepository(UnmatchedResult, 'new')
    private unmatchedRepo: Repository<UnmatchedResult>,
    @InjectDataSource('new')
    private dataSource: DataSource,
  ) {}

  /**
   * Obtiene estadísticas de los resultados sin ruta (conteo por estado y puesto).
   */
  async getUnmatchedStats(sessionId: number) {
    const statusStatsRaw = await this.unmatchedRepo
      .createQueryBuilder('u')
      .select('u.estado', 'estado')
      .addSelect('COUNT(u.id)', 'count')
      .where('u.sessionId = :sessionId', { sessionId })
      .groupBy('u.estado')
      .getRawMany<{ estado: string; count: string | number }>();

    const puestoStatsRaw = await this.dataSource
      .createQueryBuilder()
      .select('w.puesto', 'puesto')
      .addSelect('COUNT(u.id)', 'count')
      .from(UnmatchedResult, 'u')
      .innerJoin(
        RawWorker,
        'w',
        'w.excelId = u.workerId AND w.sessionId = u.sessionId',
      )
      .where('u.sessionId = :sessionId', { sessionId })
      .groupBy('w.puesto')
      .orderBy('count', 'DESC')
      .getRawMany<{ puesto: string | null; count: string | number }>();

    const byStatus = statusStatsRaw.reduce(
      (
        acc: Record<string, number>,
        curr: { estado: string; count: string | number },
      ) => {
        acc[curr.estado] = Number(curr.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    const byPuesto = puestoStatsRaw.reduce(
      (
        acc: Record<string, number>,
        curr: { puesto: string | null; count: string | number },
      ) => {
        const rawPuesto = curr.puesto;
        const key =
          rawPuesto && rawPuesto.trim() ? rawPuesto.trim() : 'Sin puesto';
        acc[key] = (acc[key] || 0) + Number(curr.count);
        return acc;
      },
      {} as Record<string, number>,
    );

    return { byStatus, byPuesto };
  }

  /**
   * Obtiene el historial de todas las sesiones de importación realizadas.
   * Incluye contadores de rutas y resultados para mostrar estadísticas en el listado.
   */
  async findAllSessions() {
    return this.sessionRepo
      .createQueryBuilder('session')
      .loadRelationCountAndMap('session.totalRutas', 'session.routes')
      .loadRelationCountAndMap('session.totalResultados', 'session.results')
      .orderBy('session.createdAt', 'DESC')
      .getMany();
  }
}
