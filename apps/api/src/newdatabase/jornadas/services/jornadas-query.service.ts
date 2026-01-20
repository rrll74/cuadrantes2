/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like } from 'typeorm';
import { ImportSession } from '../entities/import-session.entity';
import { RawWorker } from '../entities/raw-worker.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../entities/presence-result.entity';
import { UnmatchedResult } from '../entities/unmatched-result.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';

export interface SessionResultItem {
  ruta: ScheduledRoute;
  trabajador: RawWorker | null;
  fichajeEntrada: Date | null;
  fichajeSalida: Date | null;
  estado: EstadoPresencia;
  esDuplicado: boolean;
  revisar: boolean;
}

export interface PaginatedSessionResults {
  data: SessionResultItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: {
    total: number;
    completo: number;
    incompleto: number;
    sinPresencia: number;
    revisar: number;
  };
}

@Injectable()
export class JornadasQueryService {
  constructor(
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
    @InjectRepository(RawWorker, 'new')
    private workerRepo: Repository<RawWorker>,
    @InjectRepository(PresenceResult, 'new')
    private resultRepo: Repository<PresenceResult>,
    @InjectRepository(UnmatchedResult, 'new')
    private unmatchedRepo: Repository<UnmatchedResult>,
    @InjectRepository(PresenceResult, 'new')
    private presenceRepo: Repository<PresenceResult>,
    @InjectDataSource('new')
    private dataSource: DataSource,
  ) {}

  /**
   * Obtiene los resultados de la casación para una sesión específica.
   * Carga las relaciones necesarias y mapea los trabajadores para una respuesta optimizada.
   *
   * @param sessionId ID de la sesión de importación.
   * @returns Lista de resultados formateados para el frontend.
   */
  async getSessionResults(
    sessionId: number,
    page = 1,
    limit = 10,
    search?: string,
    status?: EstadoPresencia,
  ): Promise<PaginatedSessionResults> {
    let whereClause: any = { sessionId };

    if (search) {
      const workers = await this.workerRepo.find({
        where: [
          { sessionId, nombre: Like(`%${search}%`) },
          { sessionId, apellido1: Like(`%${search}%`) },
          { sessionId, apellido2: Like(`%${search}%`) },
        ],
        select: ['excelId'],
      });

      const workerIds = workers.map((w) => w.excelId);

      const conditions: any[] = [];
      if (workerIds.length > 0) {
        conditions.push({ sessionId, route: { workerId: In(workerIds) } });
      }
      conditions.push({ sessionId, route: { equipo: Like(`%${search}%`) } });

      whereClause = conditions;
    }

    if (status) {
      if (Array.isArray(whereClause)) {
        whereClause.forEach((cond) => (cond.estado = status));
      } else {
        whereClause.estado = status;
      }
    }

    const findOptions: any = {
      where: whereClause,
      relations: ['route'],
      order: {
        route: {
          fechaGeneral: 'ASC',
          inicio: 'ASC',
        },
      },
    };

    if (limit > 0) {
      findOptions.skip = (page - 1) * limit;
      findOptions.take = limit;
    }

    const [results, total] = await this.resultRepo.findAndCount(findOptions);

    // Cargar trabajadores solo para los resultados de la página actual
    const workerIds = [...new Set(results.map((r) => r.route.workerId))];
    let workersMap = new Map();

    if (workerIds.length > 0) {
      const workers = await this.workerRepo.find({
        where: { sessionId, excelId: In(workerIds) },
      });
      workersMap = new Map(workers.map((w) => [w.excelId, w]));
    }

    const data = results.map((r) => ({
      ruta: { ...r.route },
      trabajador: workersMap.get(r.route.workerId) || null,
      fichajeEntrada: r.fichajeEntrada,
      fichajeSalida: r.fichajeSalida,
      estado: r.estado,
      esDuplicado: r.esDuplicado,
      revisar: r.revisar,
    }));

    // Calcular estadísticas globales de la sesión
    const statsRaw = await this.resultRepo
      .createQueryBuilder('result')
      .select('result.estado', 'estado')
      .addSelect('COUNT(result.id)', 'count')
      .where('result.sessionId = :sessionId', { sessionId })
      .groupBy('result.estado')
      .getRawMany();

    const revisarCount = await this.resultRepo.count({
      where: { sessionId, revisar: true },
    });

    const stats = {
      total,
      completo: Number(
        statsRaw.find((s) => s.estado === EstadoPresencia.COMPLETO)?.count || 0,
      ),
      incompleto: Number(
        statsRaw.find((s) => s.estado === EstadoPresencia.INCOMPLETO)?.count ||
          0,
      ),
      sinPresencia: Number(
        statsRaw.find((s) => s.estado === EstadoPresencia.SIN_PRESENCIA)
          ?.count || 0,
      ),
      revisar: revisarCount,
    };

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
      },
      stats,
    };
  }

  /**
   * Obtiene los resultados de fichajes sin ruta (UnmatchedResults) paginados.
   *
   * @param sessionId ID de la sesión.
   * @param page Número de página.
   * @param limit Límite de resultados por página.
   * @param search Término de búsqueda (nombre del trabajador).
   */
  async getUnmatchedResults(
    sessionId: number,
    page = 1,
    limit = 10,
    search?: string,
    status?: EstadoPresencia,
  ) {
    const whereClause: any = { sessionId };

    if (status) {
      whereClause.estado = status;
    }

    if (search) {
      const workers = await this.workerRepo.find({
        where: [
          { sessionId, nombre: Like(`%${search}%`) },
          { sessionId, apellido1: Like(`%${search}%`) },
          { sessionId, apellido2: Like(`%${search}%`) },
          { sessionId, puesto: Like(`%${search}%`) },
        ],
        select: ['excelId'],
      });

      const workerIds = workers.map((w) => w.excelId);

      if (workerIds.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }

      whereClause.workerId = In(workerIds);
    }

    const findOptions: any = {
      where: whereClause,
      order: { fecha: 'ASC' },
    };
    if (limit > 0) {
      findOptions.skip = (page - 1) * limit;
      findOptions.take = limit;
    }

    const [results, total] = await this.unmatchedRepo.findAndCount(findOptions);

    // Cargar trabajadores
    const workerIds = [...new Set(results.map((r) => r.workerId))];
    let workersMap = new Map();

    if (workerIds.length > 0) {
      const workers = await this.workerRepo.find({
        where: { sessionId, excelId: In(workerIds) },
      });
      workersMap = new Map(workers.map((w) => [w.excelId, w]));
    }

    const data = results.map((r) => ({
      ...r,
      trabajador: workersMap.get(r.workerId) || null,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 1,
      },
    };
  }

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
      .getRawMany();

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
      .getRawMany();

    const byStatus = statusStatsRaw.reduce((acc, curr) => {
      acc[curr.estado] = Number(curr.count);
      return acc;
    }, {});

    const byPuesto = puestoStatsRaw.reduce((acc, curr) => {
      const rawPuesto = curr.puesto;
      const key =
        rawPuesto && rawPuesto.trim() ? rawPuesto.trim() : 'Sin puesto';
      acc[key] = (acc[key] || 0) + Number(curr.count);
      return acc;
    }, {});

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

  // TODO: Realizar separación de alguna forma de las jornadas que se pueden contabilizar de las que no. Las que no, son las que incluyen los datos de palabras clave en servicios y equipos en la configuración de sesión.

  // TODO: Arreglar error de salida de fechas porque resultan en, al menos, 1 hora menos que la que está almacenada en base de datos.

  /**
   * Genera una tabla detallada de jornadas por servicio y equipo.
   * Calcula las jornadas (horas planificadas / 7) para cada día.
   */
  /**
   * Determina el color de una celda en la tabla de jornadas.
   * - Verde: todas las rutas tienen COMPLETO
   * - Amarillento: hay alguna ruta con INCOMPLETO (pero sin SIN_PRESENCIA)
   * - Rojizo: hay alguna ruta con SIN_PRESENCIA
   */
  private getCellColor(results: PresenceResult[]): 'green' | 'yellow' | 'red' {
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

  async getJornadasTableDetail(sessionId: number) {
    // 1. Obtener todos los resultados con la relación de ruta
    const allResults = await this.presenceRepo.find({
      where: { sessionId },
      relations: ['route'],
    });

    // 2. Crear estructuras de datos para tracking de colores por celda
    // Estructura: Servicio -> Equipo -> Fecha -> { valor, color, results }
    const grouped = new Map<
      string,
      Map<string, Map<string, { hours: number; results: PresenceResult[] }>>
    >();
    const dateSet = new Set<string>();

    // 3. Agrupar datos por Servicio, Equipo, Fecha y Estado de los resultados
    allResults.forEach((res) => {
      const route = res.route;
      const servicio = route.servicio || 'Sin Servicio';
      const equipo = route.equipo || 'Sin Equipo';
      // Usar fechaGeneral (YYYY-MM-DD) como clave para agrupar columnas
      const dateKey = route.fechaGeneral.toISOString().split('T')[0];
      dateSet.add(dateKey);

      // Calcular horas: (Fin - Inicio) en milisegundos a horas
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

    // 4. Generar Columnas (Ordenadas por fecha)
    const sortedDates = Array.from(dateSet).sort();
    const columns = sortedDates.map((dateStr) => {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const days = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
      const letter = days[date.getDay()];
      return {
        key: dateStr,
        label: `${day} ${letter}`,
      };
    });

    // 5. Generar Filas con información de color
    const rows: any[] = [];
    const colTotals: Record<string, number> = {}; // Acumulador de horas por columna
    const colColors: Record<
      string,
      Map<'green' | 'yellow' | 'red', number>
    > = {}; // Tracking de colores por columna para totales
    let grandTotalHours = 0;

    // Inicializar totales de columna
    sortedDates.forEach((d) => {
      colTotals[d] = 0;
      colColors[d] = new Map<'green' | 'yellow' | 'red', number>();
      colColors[d].set('green', 0);
      colColors[d].set('yellow', 0);
      colColors[d].set('red', 0);
    });

    // Ordenar por Servicio y luego por Equipo
    const sortedServices = Array.from(grouped.keys()).sort();

    sortedServices.forEach((servicio) => {
      const serviceMap = grouped.get(servicio)!;
      const sortedTeams = Array.from(serviceMap.keys()).sort();

      sortedTeams.forEach((equipo) => {
        const teamMap = serviceMap.get(equipo)!;
        const row: any = { servicio, equipo };
        let rowTotalHours = 0;

        sortedDates.forEach((dateKey) => {
          const cellData = teamMap.get(dateKey);
          const hours = cellData?.hours || 0;
          const cellResults = cellData?.results || [];
          const color = this.getCellColor(cellResults);

          // Valor celda: jornadas = horas / 7
          row[`${dateKey}_value`] = Number((hours / 7).toFixed(2));
          row[`${dateKey}_color`] = color;

          // Acumular totales en horas
          rowTotalHours += hours;
          colTotals[dateKey] += hours;

          // Contar color para totales
          const count = colColors[dateKey].get(color) || 0;
          colColors[dateKey].set(color, count + 1);
        });

        // Total fila: suma de horas / 7
        row.total_value = Number((rowTotalHours / 7).toFixed(2));
        grandTotalHours += rowTotalHours;

        rows.push(row);
      });
    });

    // 6. Generar Footer con totales de columna y color predominante
    const footer: any = { servicio: 'TOTAL', equipo: '' };
    sortedDates.forEach((d) => {
      footer[`${d}_value`] = Number((colTotals[d] / 7).toFixed(2));

      // Determinar color predominante para la columna (rojo > amarillo > verde)
      const colorCounts = colColors[d];
      let dominantColor: 'green' | 'yellow' | 'red' = 'green';
      if ((colorCounts.get('red') || 0) > 0) {
        dominantColor = 'red';
      } else if ((colorCounts.get('yellow') || 0) > 0) {
        dominantColor = 'yellow';
      }

      footer[`${d}_color`] = dominantColor;
    });

    footer.total_value = Number((grandTotalHours / 7).toFixed(2));

    // Determinar color del total general
    let totalGrandColor: 'green' | 'yellow' | 'red' = 'green';
    Object.values(colColors).forEach((colorMap) => {
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

    return {
      columns,
      rows,
      footer,
    };
  }

  // TODO: Realizar separación de alguna forma en el resumen de las jornadas que se pueden contabilizar de las que no.

  /**
   * Calcula el sumatorio de jornadas (horas / 7) agrupado por servicio.
   * Considera todas las rutas que tienen partes de trabajo asociados.
   */
  async getJornadasByServiceSummary(sessionId: number) {
    const results = await this.presenceRepo.find({
      where: { sessionId },
      relations: ['route'],
    });

    // Filtrar rutas con partes de trabajo (partesAsociados > 0)
    const validResults = results.filter((r) => r.route.partesAsociados > 0);

    const summary = new Map<string, number>();
    let totalJornadas = 0;

    validResults.forEach((r) => {
      const servicio = r.route.servicio || 'Sin Servicio';
      // Diferencia en horas
      const diffMs = r.route.fin.getTime() - r.route.inicio.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      const jornadas = hours / 7;

      summary.set(servicio, (summary.get(servicio) || 0) + jornadas);
      totalJornadas += jornadas;
    });

    const rows = Array.from(summary.entries())
      .map(([servicio, jornadas]) => ({
        servicio,
        jornadas: Number(jornadas.toFixed(2)),
      }))
      .sort((a, b) => a.servicio.localeCompare(b.servicio));

    return {
      rows,
      total: Number(totalJornadas.toFixed(2)),
    };
  }

  // TODO: Realizar separación de alguna forma en el resumen de las jornadas que se pueden contabilizar de las que no.

  /**
   * Calcula el sumatorio de jornadas (horas / 7) agrupado por Puesto y Equal.
   * Considera todas las rutas que tienen partes de trabajo asociados.
   */
  async getJornadasByEqualAndPuestoSummary(sessionId: number) {
    const results = await this.presenceRepo.find({
      where: { sessionId },
      relations: ['route'],
    });

    // Obtener trabajadores para mapear Puesto y Equal
    const workers = await this.workerRepo.find({ where: { sessionId } });
    const workersMap = new Map<number, RawWorker>();
    workers.forEach((w) => workersMap.set(w.excelId, w));

    // Filtrar rutas con partes de trabajo (partesAsociados > 0)
    const validResults = results.filter((r) => r.route.partesAsociados > 0);

    const summary = new Map<
      string,
      { puesto: string; equal: number; jornadas: number }
    >();
    let totalJornadas = 0;

    validResults.forEach((r) => {
      const worker = workersMap.get(r.route.workerId);
      const puesto = worker?.puesto || 'Sin Puesto';
      const equal = worker?.equal || 0;

      const key = `${puesto}_${equal}`;

      // Diferencia en horas
      const diffMs = r.route.fin.getTime() - r.route.inicio.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      const jornadas = hours / 7;

      if (!summary.has(key)) {
        summary.set(key, { puesto, equal, jornadas: 0 });
      }

      const entry = summary.get(key)!;
      entry.jornadas += jornadas;
      totalJornadas += jornadas;
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

    return {
      rows,
      total: Number(totalJornadas.toFixed(2)),
    };
  }

  /**
   * Calcula el conteo y porcentaje de fichajes agrupados por estado,
   * separando entre rutas con partes y sin partes.
   */
  async getJornadasByStatusAndPartsSummary(sessionId: number) {
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
