import { Injectable } from '@nestjs/common';
import {
  PaginatedSessionResults,
  SessionQueryHelper,
  SessionStatsHelper,
  JornadasTableHelper,
  JornadasServiceSummaryHelper,
  JornadasWorkerSummaryHelper,
  JornadasStatusSummaryHelper,
  ServiceSummaryResult,
  WorkerSummaryResult,
  StatusSummaryResult,
  JornadasTableDetail,
  UnmatchedResultData,
} from './query-helpers';
import { EstadoPresencia } from '../entities/presence-result.entity';

// Re-export types for backward compatibility
export {
  PaginatedSessionResults,
  ServiceSummaryResult,
  WorkerSummaryResult,
  StatusSummaryResult,
  JornadasTableDetail,
  SessionResultItem,
} from './query-helpers';

@Injectable()
export class JornadasQueryService {
  constructor(
    private sessionQueryHelper: SessionQueryHelper,
    private sessionStatsHelper: SessionStatsHelper,
    private jornadasTableHelper: JornadasTableHelper,
    private jornadasServiceSummaryHelper: JornadasServiceSummaryHelper,
    private jornadasWorkerSummaryHelper: JornadasWorkerSummaryHelper,
    private jornadasStatusSummaryHelper: JornadasStatusSummaryHelper,
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
    return this.sessionQueryHelper.getSessionResults(
      sessionId,
      page,
      limit,
      search,
      status,
      discounted,
    );
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
  ): Promise<UnmatchedResultData> {
    return this.sessionQueryHelper.getUnmatchedResults(
      sessionId,
      page,
      limit,
      search,
      status,
    );
  }

  /**
   * Obtiene estadísticas de los resultados sin ruta (conteo por estado y puesto).
   */
  async getUnmatchedStats(sessionId: number) {
    return this.sessionStatsHelper.getUnmatchedStats(sessionId);
  }

  /**
   * Obtiene el historial de todas las sesiones de importación realizadas.
   * Incluye contadores de rutas y resultados para mostrar estadísticas en el listado.
   */
  async findAllSessions() {
    return this.sessionStatsHelper.findAllSessions();
  }

  /**
   * Genera una tabla detallada de jornadas por servicio y equipo.
   * Calcula las jornadas (horas planificadas / 7) para cada día.
   */
  async getJornadasTableDetail(
    sessionId: number,
  ): Promise<JornadasTableDetail> {
    return this.jornadasTableHelper.getJornadasTableDetail(sessionId);
  }

  /**
   * Calcula el sumatorio de jornadas (horas / 7) agrupado por servicio.
   * Considera todas las rutas que tienen partes de trabajo asociados.
   * Separa en dos listas: jornadas contabilizables y jornadas a descontar (según configuración de sesión).
   */
  async getJornadasByServiceSummary(
    sessionId: number,
  ): Promise<ServiceSummaryResult> {
    return this.jornadasServiceSummaryHelper.getJornadasByServiceSummary(
      sessionId,
    );
  }

  /**
   * Calcula el sumatorio de jornadas (horas / 7) agrupado por Puesto y Equal.
   * Considera todas las rutas que tienen partes de trabajo asociados.
   */
  async getJornadasByEqualAndPuestoSummary(
    sessionId: number,
  ): Promise<WorkerSummaryResult> {
    return this.jornadasWorkerSummaryHelper.getJornadasByEqualAndPuestoSummary(
      sessionId,
    );
  }

  /**
   * Calcula el conteo y porcentaje de fichajes agrupados por estado,
   * separando entre rutas con partes y sin partes.
   */
  async getJornadasByStatusAndPartsSummary(
    sessionId: number,
  ): Promise<StatusSummaryResult> {
    return this.jornadasStatusSummaryHelper.getJornadasByStatusAndPartsSummary(
      sessionId,
    );
  }
}
