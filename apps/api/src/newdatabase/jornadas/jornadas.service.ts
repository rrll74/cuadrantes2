/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like } from 'typeorm';
import * as fs from 'fs';
import { ImportSession } from './entities/import-session.entity';
import { ScheduledRoute } from './entities/scheduled-route.entity';
import { RawWorker } from './entities/raw-worker.entity';
import { RawClockIn, TipoFichaje } from './entities/raw-clock-in.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from './entities/presence-result.entity';
import { UnmatchedResult } from './entities/unmatched-result.entity';
import { EXCEL_COLUMNS } from '@cuadrantes/shared-dto';
import { JornadasParserService } from './services/jornadas-parser.service';
import { JornadasMatchingService } from './services/jornadas-matcher.service';
import { JornadasExportService } from './services/jornadas-export.service';

interface UploadedFiles {
  titulares: Express.Multer.File[];
  auxiliares: Express.Multer.File[];
  trabajadores: Express.Multer.File[];
  fichajes: Express.Multer.File[];
}

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
export class JornadasService {
  private readonly logger = new Logger(JornadasService.name);

  constructor(
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
    @InjectRepository(ScheduledRoute, 'new')
    private routeRepo: Repository<ScheduledRoute>,
    @InjectRepository(RawWorker, 'new')
    private workerRepo: Repository<RawWorker>,
    @InjectRepository(RawClockIn, 'new')
    private clockInRepo: Repository<RawClockIn>,
    @InjectRepository(PresenceResult, 'new')
    private resultRepo: Repository<PresenceResult>,
    @InjectRepository(UnmatchedResult, 'new')
    private unmatchedRepo: Repository<UnmatchedResult>,
    @InjectDataSource('new')
    private dataSource: DataSource,
    private parserService: JornadasParserService,
    private matchingService: JornadasMatchingService,
    private exportService: JornadasExportService,
  ) {}

  /**
   * Procesa los archivos Excel subidos (Trabajadores, Fichajes, Rutas Titulares y Auxiliares).
   * Realiza la importación de datos, validación de cabeceras y ejecuta la casación de jornadas.
   * Todo el proceso se realiza dentro de una transacción de base de datos.
   *
   * @param files Objeto con los archivos subidos.
   * @param userId ID del usuario que realiza la importación.
   * @returns Un resumen del resultado de la importación.
   */
  async procesarArchivos(files: UploadedFiles, userId?: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction(); // Iniciar transacción para asegurar integridad de datos

    const fileTrabajadores = files.trabajadores?.[0];
    const fileFichajes = files.fichajes?.[0];
    const fileTitulares = files.titulares?.[0];
    const fileAuxiliares = files.auxiliares?.[0];
    if (
      !fileTrabajadores ||
      !fileFichajes ||
      !fileTitulares ||
      !fileAuxiliares
    ) {
      throw new BadRequestException('Los archivos son requeridos');
    }

    try {
      // 1. Crear Sesión
      const session = this.sessionRepo.create({ userId });
      await queryRunner.manager.save(session);

      // 2. Parsear y Guardar Trabajadores
      const workersData = this.parserService.parseExcel(fileTrabajadores.path);

      this.validateHeaders(
        workersData,
        EXCEL_COLUMNS.TRABAJADOR,
        'Trabajadores',
      );

      const workersEntities = workersData
        .filter((w) => w[EXCEL_COLUMNS.TRABAJADOR.ID] != null) // Filtrar filas vacías
        .map((w) =>
          this.workerRepo.create({
            session,
            excelId: Number(w[EXCEL_COLUMNS.TRABAJADOR.ID]), // Asegurar conversión a número
            nombre: w[EXCEL_COLUMNS.TRABAJADOR.NOMBRE],
            apellido1: w[EXCEL_COLUMNS.TRABAJADOR.APELLIDO1],
            apellido2: w[EXCEL_COLUMNS.TRABAJADOR.APELLIDO2] || '',
            puesto: w[EXCEL_COLUMNS.TRABAJADOR.PUESTO],
            equal: Number(w[EXCEL_COLUMNS.TRABAJADOR.EQUAL]) || 0,
          }),
        );
      await queryRunner.manager.save(workersEntities);

      // 3. Parsear y Guardar Fichajes
      const clockInsData = this.parserService.parseExcel(fileFichajes.path);
      this.validateHeaders(clockInsData, EXCEL_COLUMNS.FICHAJE, 'Fichajes');

      const clockInsEntities = clockInsData
        .filter((c) => c[EXCEL_COLUMNS.FICHAJE.ID_TRABAJADOR] != null)
        .map((c) => {
          // Normalizar tipo de fichaje
          const evento: string = c[EXCEL_COLUMNS.FICHAJE.EVENTO];
          const tipo = evento?.toLowerCase().includes('entrada')
            ? TipoFichaje.ENTRADA
            : TipoFichaje.SALIDA;

          return this.clockInRepo.create({
            session,
            workerId: c[EXCEL_COLUMNS.FICHAJE.ID_TRABAJADOR],
            timestamp: new Date(c[EXCEL_COLUMNS.FICHAJE.FECHA_HORA] as string),
            tipo,
          });
        });
      await queryRunner.manager.save(clockInsEntities);

      // 4. Parsear y Guardar Rutas (Titulares y Auxiliares)
      const titularesData = this.parserService.parseExcel(fileTitulares.path);
      const auxiliaresData = this.parserService.parseExcel(fileAuxiliares.path);

      this.validateHeaders(
        titularesData,
        EXCEL_COLUMNS.RUTATITULAR,
        'Rutas Titulares',
      );
      if (auxiliaresData.length > 0) {
        this.validateHeaders(
          auxiliaresData,
          EXCEL_COLUMNS.RUTAAUXILIAR,
          'Rutas Auxiliares',
        );
      }

      // Función auxiliar para mapear datos del Excel a la entidad ScheduledRoute
      const mapRoute = (r: any, esTitular: boolean) => {
        // Lógica para extraer ID del trabajador del string "ID - Nombre" si es necesario
        // Asumimos que la columna trae el ID limpio o aplicamos limpieza
        let workerId =
          r[
            esTitular
              ? EXCEL_COLUMNS.RUTATITULAR.TRABAJADOR
              : EXCEL_COLUMNS.RUTAAUXILIAR.TRABAJADOR
          ];
        if (typeof workerId === 'string' && workerId.includes('-')) {
          workerId = parseInt(workerId.split('-')[0].trim(), 10);
        }

        // Si es auxiliar, buscar datos de la ruta titular asociada
        const ruta = esTitular
          ? null
          : this._findHojaDeRutaInTitulares(
              titularesData,
              r[EXCEL_COLUMNS.RUTAAUXILIAR.HOJARUTA],
            );

        return this.routeRepo.create(
          esTitular
            ? {
                session,
                fechaGeneral: new Date(
                  r[EXCEL_COLUMNS.RUTATITULAR.FECHA] as string,
                ),
                codigoParte: r[EXCEL_COLUMNS.RUTATITULAR.HOJARUTA],
                servicio: r[EXCEL_COLUMNS.RUTATITULAR.SERVICIO],
                turno: r[EXCEL_COLUMNS.RUTATITULAR.TURNO],
                equipo: r[EXCEL_COLUMNS.RUTATITULAR.EQUIPO],
                inicio: new Date(r[EXCEL_COLUMNS.RUTATITULAR.INICIO] as string),
                fin: new Date(r[EXCEL_COLUMNS.RUTATITULAR.FIN] as string),
                workerId: Number(workerId),
                vehiculo: r[EXCEL_COLUMNS.RUTATITULAR.VEHICULO] || '',
                kms: Number(r[EXCEL_COLUMNS.RUTATITULAR.KMS] || 0),
                esTitular,
                partesAsociados: Number(
                  r[EXCEL_COLUMNS.RUTATITULAR.PARTES_ASOCIADOS] || 0,
                ),
              }
            : {
                session,
                fechaGeneral: new Date(
                  r[EXCEL_COLUMNS.RUTAAUXILIAR.FECHA] as string,
                ),
                codigoParte: r[EXCEL_COLUMNS.RUTAAUXILIAR.HOJARUTA],
                servicio: ruta[EXCEL_COLUMNS.RUTATITULAR.SERVICIO],
                turno: ruta[EXCEL_COLUMNS.RUTATITULAR.TURNO],
                equipo: ruta[EXCEL_COLUMNS.RUTATITULAR.EQUIPO],
                inicio: new Date(
                  ruta[EXCEL_COLUMNS.RUTATITULAR.INICIO] as string,
                ),
                fin: new Date(ruta[EXCEL_COLUMNS.RUTATITULAR.FIN] as string),
                workerId: Number(workerId),
                vehiculo: ruta[EXCEL_COLUMNS.RUTATITULAR.VEHICULO] || '',
                kms: Number(ruta[EXCEL_COLUMNS.RUTATITULAR.KMS] || 0),
                esTitular,
                partesAsociados: Number(
                  ruta[EXCEL_COLUMNS.RUTATITULAR.PARTES_ASOCIADOS] || 0,
                ),
              },
        );
      };

      const routesEntities = [
        ...titularesData.map((r) => mapRoute(r, true)),
        ...auxiliaresData.map((r) => mapRoute(r, false)),
      ];
      const savedRoutes = await queryRunner.manager.save(routesEntities);

      // 5. Lógica de Casación (Matching) delegada al servicio
      const { results, usedClockInIds } = this.matchingService.match(
        session,
        savedRoutes,
        clockInsEntities,
      );

      await queryRunner.manager.save(results);

      // 6. Lógica de Sin Rutas (Fichajes no asociados)
      const unmatchedResults = this.matchingService.matchSinRutas(
        session,
        clockInsEntities,
        usedClockInIds,
      );
      await queryRunner.manager.save(unmatchedResults);

      await queryRunner.commitTransaction(); // Confirmar transacción si todo va bien

      return {
        success: true,
        sessionId: session.id,
        stats: {
          totalRutas: savedRoutes.length,
          procesados: results.length,
          conflictos: results.filter((r: PresenceResult) => r.revisar).length,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // Imprimimos el error completo en consola para depuración inmediata
      console.error('ERROR DETALLADO PROCESANDO ARCHIVOS:', error);
      // Registramos en el logger con el stack trace si está disponible
      this.logger.error(
        'Error procesando archivos',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
      this._deleteFiles([
        fileTrabajadores,
        fileFichajes,
        fileTitulares,
        fileAuxiliares,
      ]);
    }
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
  ): Promise<PaginatedSessionResults> {
    const whereClause: any = { sessionId };

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

      if (workerIds.length === 0) {
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0,
          },
          // Devolvemos stats vacíos o globales (aquí optamos por devolver estructura vacía para evitar errores en frontend)
          stats: {
            total: 0,
            completo: 0,
            incompleto: 0,
            sinPresencia: 0,
            revisar: 0,
          },
        };
      }

      whereClause.route = { workerId: In(workerIds) };
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
  ) {
    const whereClause: any = { sessionId };

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
   * Busca la ruta titular correspondiente a una hoja de ruta auxiliar.
   * Utilizado para heredar datos de la ruta titular en las auxiliares.
   */
  private _findHojaDeRutaInTitulares(titularesData: any[], hojaDeRuta) {
    const ruta = titularesData.filter(
      (r) => r[EXCEL_COLUMNS.RUTATITULAR.HOJARUTA] === hojaDeRuta,
    );
    return ruta[0];
  }

  /**
   * Elimina los archivos físicos del disco una vez procesados.
   */
  private _deleteFiles(files) {
    files.forEach((file) => {
      if (fs.existsSync(file.path as string)) {
        fs.unlinkSync(file.path as string);
      }
    });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.exportService.generateExcel(
      results.data as any,
      unmatched.data as any,
    );
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

  /**
   * Valida que el archivo Excel contenga las columnas requeridas.
   * Lanza una excepción si falta alguna columna obligatoria.
   *
   * @param data Datos parseados del Excel.
   * @param requiredColumns Columnas requeridas (string o objeto de constantes).
   * @param fileName Nombre descriptivo del archivo para el mensaje de error.
   */
  private validateHeaders(
    data: any[],
    requiredColumns: string | Record<string, string>,
    fileName: string,
  ) {
    if (!data || data.length === 0) {
      throw new BadRequestException(
        `El archivo ${fileName} está vacío o no se pudo leer.`,
      );
    }
    const firstRow: any = data[0];
    const columnsToCheck =
      typeof requiredColumns === 'string'
        ? [requiredColumns]
        : Object.values(requiredColumns);

    const missingColumns = columnsToCheck.filter(
      (col) => firstRow[col] === undefined,
    );

    if (missingColumns.length > 0) {
      const detectedHeaders = Object.keys(firstRow).join(', ');
      throw new BadRequestException(
        `El archivo ${fileName} no contiene la(s) columna(s) requerida(s): "${missingColumns.join(
          ', ',
        )}". Columnas detectadas: [${detectedHeaders}]`,
      );
    }
  }
}
