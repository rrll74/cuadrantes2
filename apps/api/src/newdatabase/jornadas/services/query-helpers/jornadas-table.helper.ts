import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format } from 'date-fns';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';
import { ImportSession } from '../../entities/import-session.entity';
import {
  JornadasTableDetail,
  CellColor,
  JornadasTableRow,
  JornadasTableFooter,
} from './types';

@Injectable()
export class JornadasTableHelper {
  constructor(
    @InjectRepository(PresenceResult, 'new')
    private presenceRepo: Repository<PresenceResult>,
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
  ) {}

  /**
   * Determina el color de una celda en la tabla de jornadas.
   * - Verde: todas las rutas tienen COMPLETO
   * - Amarillento: hay alguna ruta con INCOMPLETO (pero sin SIN_PRESENCIA)
   * - Rojizo: hay alguna ruta con SIN_PRESENCIA
   */
  private getCellColor(results: PresenceResult[]): CellColor {
    if (results.length === 0) return 'green';

    const hasWithoutPresence = results.some(
      (r) => r.estado === EstadoPresencia.SIN_PRESENCIA,
    );
    if (hasWithoutPresence) return 'red';

    const hasIncomplete = results.some(
      (r) => r.estado === EstadoPresencia.INCOMPLETO,
    );
    if (hasIncomplete) return 'yellow';

    return 'green';
  }

  /**
   * Genera una tabla detallada de jornadas por servicio y equipo.
   * Calcula las jornadas (horas planificadas / 7) para cada día.
   */
  async getJornadasTableDetail(
    sessionId: number,
  ): Promise<JornadasTableDetail> {
    const allResults = await this.presenceRepo.find({
      where: { sessionId },
      relations: ['route'],
    });

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

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

    const grouped = new Map<
      string,
      Map<string, Map<string, { hours: number; results: PresenceResult[] }>>
    >();
    const dateSet = new Set<string>();

    allResults.forEach((res) => {
      const route = res.route;
      const servicio = route.servicio || 'Sin Servicio';
      const equipo = route.equipo || 'Sin Equipo';
      const dateKey = format(route.fechaGeneral, 'yyyy-MM-dd');
      dateSet.add(dateKey);

      const diffMs = route.fin.getTime() - route.inicio.getTime();
      const hours = diffMs / (1000 * 60 * 60);

      if (!grouped.has(servicio)) {
        grouped.set(servicio, new Map());
      }
      const serviceMap = grouped.get(servicio)!;

      if (!serviceMap.has(equipo)) {
        serviceMap.set(equipo, new Map());
      }
      const teamMap = serviceMap.get(equipo)!;

      if (!teamMap.has(dateKey)) {
        teamMap.set(dateKey, { hours: 0, results: [] });
      }

      const cellData = teamMap.get(dateKey)!;
      cellData.hours += hours;
      cellData.results.push(res);
    });

    const sortedDates = Array.from(dateSet).sort();
    const columns = sortedDates.map((dateStr) => {
      const date = new Date(`${dateStr}T00:00:00`);
      const day = date.getDate().toString().padStart(2, '0');
      const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
      const letter = days[date.getDay()];
      return {
        key: dateStr,
        label: `${day} ${letter}`,
      };
    });

    const { rows, discountedRows, stats } = this._generateRowsAndStats(
      grouped,
      sortedDates,
      discountServices,
      discountTeams,
    );

    const footer = this._generateFooter(
      sortedDates,
      stats.normal.totals,
      stats.normal.colors,
      stats.normal.grandTotal,
      'TOTAL',
    );
    const discountedFooter = this._generateFooter(
      sortedDates,
      stats.discounted.totals,
      stats.discounted.colors,
      stats.discounted.grandTotal,
      'TOTAL DESCONTADO',
    );

    return {
      columns,
      rows,
      footer,
      discountedRows,
      discountedFooter,
    };
  }

  private _generateRowsAndStats(
    grouped: Map<
      string,
      Map<string, Map<string, { hours: number; results: PresenceResult[] }>>
    >,
    sortedDates: string[],
    discountServices: string[],
    discountTeams: string[],
  ) {
    const rows: JornadasTableRow[] = [];
    const discountedRows: JornadasTableRow[] = [];

    const colTotals: Record<string, number> = {};
    const colColors: Record<string, Map<CellColor, number>> = {};
    let grandTotalHours = 0;

    const colTotalsDiscounted: Record<string, number> = {};
    const colColorsDiscounted: Record<string, Map<CellColor, number>> = {};
    let grandTotalHoursDiscounted = 0;

    sortedDates.forEach((d) => {
      colTotals[d] = 0;
      colColors[d] = new Map();
      (['green', 'yellow', 'red'] as CellColor[]).forEach((c) =>
        colColors[d].set(c, 0),
      );

      colTotalsDiscounted[d] = 0;
      colColorsDiscounted[d] = new Map();
      (['green', 'yellow', 'red'] as CellColor[]).forEach((c) =>
        colColorsDiscounted[d].set(c, 0),
      );
    });

    const sortedServices = Array.from(grouped.keys()).sort();

    sortedServices.forEach((servicio) => {
      const serviceMap = grouped.get(servicio)!;
      const sortedTeams = Array.from(serviceMap.keys()).sort();

      sortedTeams.forEach((equipo) => {
        const teamMap = serviceMap.get(equipo)!;
        const row: JornadasTableRow = { servicio, equipo } as JornadasTableRow;
        let rowTotalHours = 0;

        const isServiceDiscounted = discountServices.some((ds) =>
          servicio.toLowerCase().includes(ds),
        );
        const isTeamDiscounted = discountTeams.some((dt) =>
          equipo.toLowerCase().includes(dt),
        );
        const isDiscounted = isServiceDiscounted || isTeamDiscounted;

        sortedDates.forEach((dateKey) => {
          const cellData = teamMap.get(dateKey);
          const hours = cellData?.hours || 0;
          const cellResults = cellData?.results || [];
          const color = this.getCellColor(cellResults);

          row[`${dateKey}_value`] = Number((hours / 7).toFixed(2));
          row[`${dateKey}_color`] = color;

          rowTotalHours += hours;

          if (isDiscounted) {
            colTotalsDiscounted[dateKey] += hours;
            const count = colColorsDiscounted[dateKey].get(color) || 0;
            colColorsDiscounted[dateKey].set(color, count + 1);
          } else {
            colTotals[dateKey] += hours;
            const count = colColors[dateKey].get(color) || 0;
            colColors[dateKey].set(color, count + 1);
          }
        });

        row.total_value = Number((rowTotalHours / 7).toFixed(2));

        if (isDiscounted) {
          grandTotalHoursDiscounted += rowTotalHours;
          discountedRows.push(row);
        } else {
          grandTotalHours += rowTotalHours;
          rows.push(row);
        }
      });
    });

    return {
      rows,
      discountedRows,
      stats: {
        normal: {
          totals: colTotals,
          colors: colColors,
          grandTotal: grandTotalHours,
        },
        discounted: {
          totals: colTotalsDiscounted,
          colors: colColorsDiscounted,
          grandTotal: grandTotalHoursDiscounted,
        },
      },
    };
  }

  private _generateFooter(
    sortedDates: string[],
    totals: Record<string, number>,
    colors: Record<string, Map<CellColor, number>>,
    grandTotal: number,
    label: string,
  ): JornadasTableFooter {
    const footer: JornadasTableFooter = {
      servicio: label,
      equipo: '',
    } as JornadasTableFooter;
    sortedDates.forEach((d) => {
      footer[`${d}_value`] = Number((totals[d] / 7).toFixed(2));

      const colorCounts = colors[d];
      let dominantColor: CellColor = 'green';
      if ((colorCounts.get('red') || 0) > 0) {
        dominantColor = 'red';
      } else if ((colorCounts.get('yellow') || 0) > 0) {
        dominantColor = 'yellow';
      }

      footer[`${d}_color`] = dominantColor;
    });

    footer.total_value = Number((grandTotal / 7).toFixed(2));

    let totalGrandColor: CellColor = 'green';
    Object.values(colors).forEach((colorMap) => {
      if ((colorMap.get('red') || 0) > 0) {
        totalGrandColor = 'red';
      } else if (
        (colorMap.get('yellow') || 0) > 0 &&
        totalGrandColor !== 'red'
      ) {
        totalGrandColor = 'yellow';
      }
    });
    footer.total_color = totalGrandColor;
    return footer;
  }
}
