import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PresenceResult } from '../../entities/presence-result.entity';
import { ImportSession } from '../../entities/import-session.entity';
import { ServiceSummaryResult } from './types';

@Injectable()
export class JornadasServiceSummaryHelper {
  constructor(
    @InjectRepository(PresenceResult, 'new')
    private presenceRepo: Repository<PresenceResult>,
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
  ) {}

  /**
   * Calcula el sumatorio de jornadas (horas / 7) agrupado por servicio.
   * Considera todas las rutas que tienen partes de trabajo asociados.
   * Separa en dos listas: jornadas contabilizables y jornadas a descontar (según configuración de sesión).
   */
  async getJornadasByServiceSummary(
    sessionId: number,
  ): Promise<ServiceSummaryResult> {
    const results = await this.presenceRepo.find({
      where: { sessionId },
      relations: ['route'],
    });

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

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

    const summary = new Map<string, number>();
    const summaryDiscounted = new Map<string, number>();
    let totalJornadas = 0;
    let totalDiscounted = 0;

    validResults.forEach((r) => {
      const servicio = r.route.servicio || 'Sin Servicio';
      const equipo = r.route.equipo || 'Sin Equipo';

      const isServiceDiscounted = discountServices.some((ds) =>
        servicio.toLowerCase().includes(ds),
      );
      const isTeamDiscounted = discountTeams.some((dt) =>
        equipo.toLowerCase().includes(dt),
      );
      const isDiscounted = isServiceDiscounted || isTeamDiscounted;

      const diffMs = r.route.fin.getTime() - r.route.inicio.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      const jornadas = hours / 7;

      if (isDiscounted) {
        summaryDiscounted.set(
          servicio,
          (summaryDiscounted.get(servicio) || 0) + jornadas,
        );
        totalDiscounted += jornadas;
      } else {
        summary.set(servicio, (summary.get(servicio) || 0) + jornadas);
        totalJornadas += jornadas;
      }
    });

    const rows = Array.from(summary.entries())
      .map(([servicio, jornadas]) => ({
        servicio,
        jornadas: Number(jornadas.toFixed(2)),
      }))
      .sort((a, b) => a.servicio.localeCompare(b.servicio));

    const discountedRows = Array.from(summaryDiscounted.entries())
      .map(([servicio, jornadas]) => ({
        servicio,
        jornadas: Number(jornadas.toFixed(2)),
      }))
      .sort((a, b) => a.servicio.localeCompare(b.servicio));

    return {
      rows,
      discountedRows,
      total: Number(totalJornadas.toFixed(2)),
      discountedTotal: Number(totalDiscounted.toFixed(2)),
      session,
    };
  }
}
