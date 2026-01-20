import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PresenceResult } from '../../entities/presence-result.entity';
import { RawWorker } from '../../entities/raw-worker.entity';
import { ImportSession } from '../../entities/import-session.entity';
import { WorkerSummaryResult } from './types';

@Injectable()
export class JornadasWorkerSummaryHelper {
  constructor(
    @InjectRepository(PresenceResult, 'new')
    private presenceRepo: Repository<PresenceResult>,
    @InjectRepository(RawWorker, 'new')
    private workerRepo: Repository<RawWorker>,
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
  ) {}

  /**
   * Calcula el sumatorio de jornadas (horas / 7) agrupado por Puesto y Equal.
   * Considera todas las rutas que tienen partes de trabajo asociados.
   */
  async getJornadasByEqualAndPuestoSummary(
    sessionId: number,
  ): Promise<WorkerSummaryResult> {
    const results = await this.presenceRepo.find({
      where: { sessionId },
      relations: ['route'],
    });

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    const workers = await this.workerRepo.find({ where: { sessionId } });
    const workersMap = new Map<number, RawWorker>();
    workers.forEach((w) => workersMap.set(w.excelId, w));

    const validResults = results.filter((r) => r.route.partesAsociados > 0);

    const discountServices = session?.discountServices
      ? session.discountServices
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter((s) => s.length > 0)
      : [];

    const discountTeams = session?.discountTeams
      ? session.discountTeams
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter((t) => t.length > 0)
      : [];

    const summary = new Map<
      string,
      { puesto: string; equal: number; jornadas: number }
    >();
    const summaryDiscounted = new Map<
      string,
      { puesto: string; equal: number; jornadas: number }
    >();
    let totalJornadas = 0;
    let totalDiscounted = 0;

    validResults.forEach((r) => {
      const worker = workersMap.get(r.route.workerId);
      const puesto = worker?.puesto || 'Sin Puesto';
      const equal = worker?.equal || 0;
      const servicio = r.route.servicio || 'Sin Servicio';
      const equipo = r.route.equipo || 'Sin Equipo';

      const isServiceDiscounted = discountServices.some((ds) =>
        servicio.toLowerCase().includes(ds),
      );
      const isTeamDiscounted = discountTeams.some((dt) =>
        equipo.toLowerCase().includes(dt),
      );
      const isDiscounted = isServiceDiscounted || isTeamDiscounted;

      const key = `${puesto}_${equal}`;

      const diffMs = r.route.fin.getTime() - r.route.inicio.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      const jornadas = hours / 7;

      if (isDiscounted) {
        if (!summaryDiscounted.has(key)) {
          summaryDiscounted.set(key, { puesto, equal, jornadas: 0 });
        }
        const entry = summaryDiscounted.get(key)!;
        entry.jornadas += jornadas;
        totalDiscounted += jornadas;
      } else {
        if (!summary.has(key)) {
          summary.set(key, { puesto, equal, jornadas: 0 });
        }
        const entry = summary.get(key)!;
        entry.jornadas += jornadas;
        totalJornadas += jornadas;
      }
    });

    const rows = Array.from(summary.values())
      .map((item) => ({
        puesto: item.puesto,
        equal: item.equal,
        jornadas: Number(item.jornadas.toFixed(2)),
      }))
      .sort((a, b) => {
        const puestoCompare = a.puesto.localeCompare(b.puesto);
        if (puestoCompare !== 0) return puestoCompare;
        return b.equal - a.equal;
      });

    const discountedRows = Array.from(summaryDiscounted.values())
      .map((item) => ({
        puesto: item.puesto,
        equal: item.equal,
        jornadas: Number(item.jornadas.toFixed(2)),
      }))
      .sort((a, b) => {
        const puestoCompare = a.puesto.localeCompare(b.puesto);
        if (puestoCompare !== 0) return puestoCompare;
        return b.equal - a.equal;
      });

    return {
      rows,
      discountedRows,
      total: Number(totalJornadas.toFixed(2)),
      discountedTotal: Number(totalDiscounted.toFixed(2)),
      session,
    };
  }
}
