/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import { EXCEL_COLUMNS } from '@cuadrantes/shared-dto';
import { ImportSession } from '../entities/import-session.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';
import { RawWorker } from '../entities/raw-worker.entity';
import { RawClockIn, TipoFichaje } from '../entities/raw-clock-in.entity';
import { PresenceResult } from '../entities/presence-result.entity';
import { JornadasParserService } from './jornadas-parser.service';
import { JornadasMatchingService } from './jornadas-matcher.service';

export interface UploadedFiles {
  titulares: Express.Multer.File[];
  auxiliares: Express.Multer.File[];
  trabajadores: Express.Multer.File[];
  fichajes: Express.Multer.File[];
}

@Injectable()
export class JornadasImportService {
  private readonly logger = new Logger(JornadasImportService.name);

  constructor(
    @InjectRepository(ImportSession, 'new')
    private sessionRepo: Repository<ImportSession>,
    @InjectRepository(ScheduledRoute, 'new')
    private routeRepo: Repository<ScheduledRoute>,
    @InjectRepository(RawWorker, 'new')
    private workerRepo: Repository<RawWorker>,
    @InjectRepository(RawClockIn, 'new')
    private clockInRepo: Repository<RawClockIn>,
    @InjectDataSource('new')
    private dataSource: DataSource,
    private parserService: JornadasParserService,
    private matchingService: JornadasMatchingService,
  ) {}

  /**
   * Procesa los archivos Excel subidos (Trabajadores, Fichajes, Rutas Titulares y Auxiliares).
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
  /**
   * Busca la ruta titular correspondiente a una hoja de ruta auxiliar.
   * Utilizado para heredar datos de la ruta titular en las auxiliares.
   */
  private _findHojaDeRutaInTitulares(titularesData: any[], hojaDeRuta) {
    const ruta = titularesData.filter(
      (r) => r[EXCEL_COLUMNS.RUTATITULAR.HOJARUTA] === hojaDeRuta,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return ruta[0];
  }

  /**
   * Elimina los archivos físicos del disco una vez procesados.
   */
  private _deleteFiles(files) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    files.forEach((file) => {
      if (fs.existsSync(file.path as string)) {
        fs.unlinkSync(file.path as string);
      }
    });
  }
}
