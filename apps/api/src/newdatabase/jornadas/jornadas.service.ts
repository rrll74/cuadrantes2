import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportSession } from './entities/import-session.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from './entities/presence-result.entity';
import { JornadasExportService } from './services/jornadas-export.service';
import {
  JornadasImportService,
  MonthInfo,
  UploadedFiles,
} from './services/jornadas-import.service';
import {
  JornadasQueryService,
  PaginatedSessionResults,
  SessionResultItem,
} from './services/jornadas-query.service';

export type { UploadedFiles, PaginatedSessionResults, SessionResultItem };

@Injectable()
export class JornadasService {
  private readonly logger = new Logger(JornadasService.name);

  constructor(
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
    @InjectRepository(PresenceResult, 'new')
    private presenceRepo: Repository<PresenceResult>,
    private importService: JornadasImportService,
    private queryService: JornadasQueryService,
    private exportService: JornadasExportService,
  ) {}

  /**
   * Procesa los archivos Excel subidos (Trabajadores, Fichajes, Rutas Titulares y Auxiliares).
   * Realiza la importación de datos, validación de cabeceras y ejecuta la casación de jornadas.
   * El proceso se realiza dentro de una transacción de base de datos.
   *
   * @param files Objeto con los archivos subidos.
   * @param userId ID del usuario que realiza la importación.
   * @param monthInfoJson JSON string con la información de la sesión (temporada, jornadas, etc).
   * @returns Un resumen del resultado de la importación.
   */
  async procesarArchivos(
    files: UploadedFiles,
    userId?: number,
    monthInfoJson?: string,
  ) {
    let monthInfo: MonthInfo | undefined;
    if (monthInfoJson) {
      try {
        monthInfo = JSON.parse(monthInfoJson) as MonthInfo;
      } catch (error) {
        this.logger.error('Error parsing monthInfo JSON', error);
      }
    }

    return this.importService.procesarArchivos(files, userId, monthInfo);
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
    return this.queryService.getUnmatchedResults(
      sessionId,
      page,
      limit,
      search,
      status,
    );
  }

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
    return this.queryService.getSessionResults(
      sessionId,
      page,
      limit,
      search,
      status,
      discounted,
    );
  }

  /**
   * Obtiene estadísticas de los resultados sin ruta (conteo por estado y puesto).
   */
  async getUnmatchedStats(sessionId: number) {
    return this.queryService.getUnmatchedStats(sessionId);
  }

  async getJornadasTableDetail(sessionId: number) {
    return this.queryService.getJornadasTableDetail(sessionId);
  }

  async getJornadasByServiceSummary(sessionId: number) {
    return this.queryService.getJornadasByServiceSummary(sessionId);
  }

  async getJornadasByEqualAndPuestoSummary(sessionId: number) {
    return this.queryService.getJornadasByEqualAndPuestoSummary(sessionId);
  }

  async getJornadasByStatusAndPartsSummary(sessionId: number) {
    return this.queryService.getJornadasByStatusAndPartsSummary(sessionId);
  }

  /**
   * Incluye contadores de rutas y resultados para mostrar estadísticas en el listado.
   */
  async findAllSessions() {
    return this.queryService.findAllSessions();
  }

  /**
   * Genera un archivo Excel con los resultados de una sesión.
   *
   * @param sessionId ID de la sesión.
   * @returns Buffer del archivo Excel generado.
   */
  async generateExcelExport(sessionId: number): Promise<Buffer> {
    // Obtener todos los resultados (limit=0)
    const results = await this.getSessionResults(sessionId, 1, 0);
    const unmatched = await this.getUnmatchedResults(sessionId, 1, 0);
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    const summaryTable =
      await this.queryService.getJornadasTableDetail(sessionId);
    const serviceSummary =
      await this.queryService.getJornadasByServiceSummary(sessionId);
    const equalPuestoSummary =
      await this.queryService.getJornadasByEqualAndPuestoSummary(sessionId);
    const statusPartsSummary =
      await this.queryService.getJornadasByStatusAndPartsSummary(sessionId);

    return this.exportService.generateExcel(
      results.data,
      unmatched.data,
      session,
      summaryTable,
      serviceSummary,
      equalPuestoSummary,
      statusPartsSummary,
    );
  }

  /**
   * Elimina una sesión y todos sus datos asociados.
   * Las entidades dependientes (rutas, trabajadores, fichajes, resultados)
   * se eliminan automáticamente gracias a la configuración de borrado en cascada.
   */
  async deleteSession(id: number) {
    const result = await this.sessionRepo.delete(id);
    if (result.affected === 0) {
      throw new BadRequestException(`La sesión con ID ${id} no existe.`);
    }
    return { success: true };
  }
}
