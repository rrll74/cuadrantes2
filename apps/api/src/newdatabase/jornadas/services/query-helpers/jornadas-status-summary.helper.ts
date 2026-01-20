import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';
import { StatusSummaryResult } from './types';

@Injectable()
export class JornadasStatusSummaryHelper {
  constructor(
    @InjectRepository(PresenceResult, 'new')
    private presenceRepo: Repository<PresenceResult>,
  ) {}

  /**
   * Calcula el conteo y porcentaje de fichajes agrupados por estado,
   * separando entre rutas con partes y sin partes.
   */
  async getJornadasByStatusAndPartsSummary(
    sessionId: number,
  ): Promise<StatusSummaryResult> {
    const results = await this.presenceRepo.find({
      where: { sessionId },
      relations: ['route'],
    });

    const stats = {
      withParts: {
        [EstadoPresencia.COMPLETO]: 0,
        [EstadoPresencia.INCOMPLETO]: 0,
        [EstadoPresencia.SIN_PRESENCIA]: 0,
        total: 0,
      },
      withoutParts: {
        [EstadoPresencia.COMPLETO]: 0,
        [EstadoPresencia.INCOMPLETO]: 0,
        [EstadoPresencia.SIN_PRESENCIA]: 0,
        total: 0,
      },
    };

    results.forEach((r) => {
      const hasParts = r.route.partesAsociados > 0;
      const target = hasParts ? stats.withParts : stats.withoutParts;

      if (target[r.estado] !== undefined) {
        target[r.estado]++;
        target.total++;
      }
    });

    const rows = Object.values(EstadoPresencia).map((estado) => {
      const noPartsCount = stats.withoutParts[estado];
      const noPartsTotal = stats.withoutParts.total;
      const noPartsPercent =
        noPartsTotal > 0 ? (noPartsCount / noPartsTotal) * 100 : 0;

      const withPartsCount = stats.withParts[estado];
      const withPartsTotal = stats.withParts.total;
      const withPartsPercent =
        withPartsTotal > 0 ? (withPartsCount / withPartsTotal) * 100 : 0;

      return {
        estado,
        noPartsCount,
        noPartsPercent: Number(noPartsPercent.toFixed(2)),
        withPartsCount,
        withPartsPercent: Number(withPartsPercent.toFixed(2)),
      };
    });

    const footer = {
      estado: 'TOTAL',
      noPartsCount: stats.withoutParts.total,
      noPartsPercent: stats.withoutParts.total > 0 ? 100 : 0,
      withPartsCount: stats.withParts.total,
      withPartsPercent: stats.withParts.total > 0 ? 100 : 0,
    };

    return { rows, footer };
  }
}
