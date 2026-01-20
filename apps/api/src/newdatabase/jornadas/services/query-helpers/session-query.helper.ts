import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, Brackets } from 'typeorm';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';
import { RawWorker } from '../../entities/raw-worker.entity';
import { ImportSession } from '../../entities/import-session.entity';
import { UnmatchedResult } from '../../entities/unmatched-result.entity';
import { PaginatedSessionResults, SessionResultItem } from './types';

interface EstadoStats {
  estado: EstadoPresencia;
  count: string;
}

@Injectable()
export class SessionQueryHelper {
  constructor(
    @InjectRepository(RawWorker, 'new')
    private workerRepo: Repository<RawWorker>,
    @InjectRepository(PresenceResult, 'new')
    private resultRepo: Repository<PresenceResult>,
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
    @InjectRepository(UnmatchedResult, 'new')
    private unmatchedRepo: Repository<UnmatchedResult>,
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
    discounted?: string,
  ): Promise<PaginatedSessionResults> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    const discountServices =
      session?.discountServices
        ?.split(',')
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean) || [];
    const discountTeams =
      session?.discountTeams
        ?.split(',')
        .map((t: string) => t.trim().toLowerCase())
        .filter(Boolean) || [];

    const qb = this.resultRepo
      .createQueryBuilder('result')
      .innerJoinAndSelect('result.route', 'route')
      .where('result.sessionId = :sessionId', { sessionId });

    if (status) {
      qb.andWhere('result.estado = :status', { status });
    }

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

      qb.andWhere(
        new Brackets((qb2) => {
          if (workerIds.length > 0) {
            qb2.where('route.workerId IN (:...workerIds)', { workerIds });
          } else {
            qb2.where('1=0');
          }
          qb2.orWhere('route.equipo LIKE :searchTeam', {
            searchTeam: `%${search}%`,
          });
        }),
      );
    }

    if (discounted !== undefined && discounted !== '') {
      const isDiscounted = discounted === 'true';
      const conditions: string[] = [];
      const params: Record<string, string> = {};

      discountServices.forEach((s, i) => {
        conditions.push(`LOWER(route.servicio) LIKE :ds${i}`);
        params[`ds${i}`] = `%${s}%`;
      });
      discountTeams.forEach((t, i) => {
        conditions.push(`LOWER(route.equipo) LIKE :dt${i}`);
        params[`dt${i}`] = `%${t}%`;
      });

      if (conditions.length > 0) {
        const sql = `(${conditions.join(' OR ')})`;
        if (isDiscounted) {
          qb.andWhere(sql, params);
        } else {
          qb.andWhere(`NOT ${sql}`, params);
        }
      } else {
        if (isDiscounted) {
          qb.andWhere('1=0');
        }
      }
    }

    qb.orderBy('route.fechaGeneral', 'ASC').addOrderBy('route.inicio', 'ASC');

    if (limit > 0) {
      qb.skip((page - 1) * limit).take(limit);
    }

    const [results, total] = await qb.getManyAndCount();

    const workerIds = [...new Set(results.map((r) => r.route.workerId))];
    let workersMap = new Map<number, RawWorker>();

    if (workerIds.length > 0) {
      const workers = await this.workerRepo.find({
        where: { sessionId, excelId: In(workerIds) },
      });
      workersMap = new Map(workers.map((w) => [w.excelId, w]));
    }

    const data: SessionResultItem[] = results.map((r) => {
      const isServiceDiscounted = discountServices.some((ds) =>
        (r.route.servicio || '').toLowerCase().includes(ds),
      );
      const isTeamDiscounted = discountTeams.some((dt) =>
        (r.route.equipo || '').toLowerCase().includes(dt),
      );

      return {
        ruta: { ...r.route },
        trabajador: workersMap.get(r.route.workerId) || null,
        fichajeEntrada: r.fichajeEntrada,
        fichajeSalida: r.fichajeSalida,
        estado: r.estado,
        esDuplicado: r.esDuplicado,
        revisar: r.revisar,
        isDiscounted: isServiceDiscounted || isTeamDiscounted,
      };
    });

    const statsRaw = await this.resultRepo
      .createQueryBuilder('result')
      .select('result.estado', 'estado')
      .addSelect('COUNT(result.id)', 'count')
      .where('result.sessionId = :sessionId', { sessionId })
      .groupBy('result.estado')
      .getRawMany<EstadoStats>();

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
    const whereClause: {
      sessionId: number;
      estado?: EstadoPresencia;
      workerId?: any;
    } = { sessionId };

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

    const findOptions: {
      where: typeof whereClause;
      order: Record<string, string>;
      skip?: number;
      take?: number;
    } = {
      where: whereClause,
      order: { fecha: 'ASC' },
    };
    if (limit > 0) {
      findOptions.skip = (page - 1) * limit;
      findOptions.take = limit;
    }

    const [results, total] = await this.unmatchedRepo.findAndCount(findOptions);

    const workerIds2 = [...new Set(results.map((r) => r.workerId))];
    let workersMap = new Map<number, RawWorker>();

    if (workerIds2.length > 0) {
      const workers = await this.workerRepo.find({
        where: { sessionId, excelId: In(workerIds2) },
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
}
