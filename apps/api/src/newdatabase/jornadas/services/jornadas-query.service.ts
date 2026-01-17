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
}
