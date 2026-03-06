/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import { EXCEL_COLUMNS, IMPORT_TYPES } from '@cuadrantes/shared-dto';
import { ImportSession } from '../entities/import-session.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';
import { RawWorker } from '../entities/raw-worker.entity';
import { RawClockIn, TipoFichaje } from '../entities/raw-clock-in.entity';
import { PresenceResult } from '../entities/presence-result.entity';
import { JornadasParserService } from './jornadas-parser.service';
import { JornadasTextParserService } from './jornadas-text-parser.service';
import { JornadasMatchingService } from './jornadas-matcher.service';

export interface UploadedFiles {
  titulares?: Express.Multer.File[];
  auxiliares?: Express.Multer.File[];
  trabajadores: Express.Multer.File[];
  fichajes: Express.Multer.File[];
  // Para tipo 2
  rutas?: Express.Multer.File[];
  rutasDocumento?: Express.Multer.File[];
}

export interface MonthInfo {
  isHighSeason: boolean;
  daysMonFri: number;
  shiftsMonFri: number;
  daysSatSunHol: number;
  shiftsSatSunHol: number;
  discountServices: string;
  discountTeams: string;
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
    private textParserService: JornadasTextParserService,
    private matchingService: JornadasMatchingService,
  ) {}

  /**
   * Procesa los archivos Excel subidos según el tipo de importación
   * Tipo 1: Trabajadores, Fichajes, Rutas Titulares y Auxiliares (separados)
   * Tipo 2: Trabajadores, Fichajes, Rutas (unificadas) y opcionalmente Rutas con Documento (TXT)
   */
  async procesarArchivos(
    files: UploadedFiles,
    userId?: number,
    monthInfo?: MonthInfo,
    importType: number = IMPORT_TYPES.PRIMARY,
  ) {
    this.logger.log(
      `Iniciando procesamiento de archivos - Tipo: ${importType}`,
    );

    if (importType === IMPORT_TYPES.PRIMARY) {
      return this.procesarArchivosPrimarios(files, userId, monthInfo);
    } else if (importType === IMPORT_TYPES.SECONDARY) {
      return this.procesarArchivosSecundarios(files, userId, monthInfo);
    } else {
      throw new BadRequestException(
        `Tipo de importación inválido: ${importType}`,
      );
    }
  }

  /**
   * Procesa archivos en formato tipo 1 (Titulares + Auxiliares separados)
   */
  async procesarArchivosPrimarios(
    files: UploadedFiles,
    userId?: number,
    monthInfo?: MonthInfo,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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
      throw new BadRequestException(
        'Para importación tipo 1, se requieren: trabajadores, fichajes, titulares y auxiliares',
      );
    }

    try {
      // 1. Crear Sesión
      const session = this.sessionRepo.create({
        userId,
        importType: IMPORT_TYPES.PRIMARY,
        ...(monthInfo || {}),
      });
      await queryRunner.manager.save(session);

      // 2. Parsear y Guardar Trabajadores
      const workersData = this.parserService.parseExcel(fileTrabajadores.path);
      this.parserService.validateHeaders(
        workersData,
        'trabajadores',
        IMPORT_TYPES.PRIMARY,
      );

      const workersEntities = workersData
        .filter((w) => w[EXCEL_COLUMNS.TRABAJADOR.ID] != null)
        .map((w) =>
          this.workerRepo.create({
            session,
            excelId: Number(w[EXCEL_COLUMNS.TRABAJADOR.ID]),
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
      this.parserService.validateHeaders(
        clockInsData,
        'fichajes',
        IMPORT_TYPES.PRIMARY,
      );

      const clockInsEntities = clockInsData
        .filter((c) => c[EXCEL_COLUMNS.FICHAJE.ID_TRABAJADOR] != null)
        .map((c) => {
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

      this.parserService.validateHeaders(
        titularesData,
        'titulares',
        IMPORT_TYPES.PRIMARY,
      );
      if (auxiliaresData.length > 0) {
        this.parserService.validateHeaders(
          auxiliaresData,
          'auxiliares',
          IMPORT_TYPES.PRIMARY,
        );
      }

      // Función auxiliar para mapear datos del Excel a la entidad ScheduledRoute
      const mapRoute = (r: any, esTitular: boolean) => {
        let workerId =
          r[
            esTitular
              ? EXCEL_COLUMNS.RUTATITULAR.TRABAJADOR
              : EXCEL_COLUMNS.RUTAAUXILIAR.TRABAJADOR
          ];
        if (typeof workerId === 'string' && workerId.includes('-')) {
          workerId = parseInt(workerId.split('-')[0].trim(), 10);
        }

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
        ...titularesData
          .filter((r) => {
            const equipo = r[EXCEL_COLUMNS.RUTATITULAR.EQUIPO];
            return (
              equipo !== null &&
              equipo !== undefined &&
              String(equipo).trim() !== ''
            );
          })
          .map((r) => mapRoute(r, true)),
        ...auxiliaresData.map((r) => mapRoute(r, false)),
      ];
      const savedRoutes = await queryRunner.manager.save(routesEntities);

      // 5. Lógica de Casación (Matching)
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

      await queryRunner.commitTransaction();

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
      console.error('ERROR DETALLADO PROCESANDO ARCHIVOS TIPO 1:', error);
      this.logger.error(
        'Error procesando archivos primarios',
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
   * Procesa archivos en formato tipo 2 (Rutas unificadas)
   */
  async procesarArchivosSecundarios(
    files: UploadedFiles,
    userId?: number,
    monthInfo?: MonthInfo,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const fileTrabajadores = files.trabajadores?.[0];
    const fileFichajes = files.fichajes?.[0];
    const fileRutas = files.rutas?.[0];
    const fileRutasDocumento = files.rutasDocumento?.[0];

    if (!fileTrabajadores || !fileFichajes || !fileRutas) {
      throw new BadRequestException(
        'Para importación tipo 2, se requieren: trabajadores, fichajes y rutas',
      );
    }

    try {
      // 1. Crear Sesión
      const session = this.sessionRepo.create({
        userId,
        importType: IMPORT_TYPES.SECONDARY,
        ...(monthInfo || {}),
      });
      await queryRunner.manager.save(session);

      // 2. Parsear Trabajadores (formato combinado tipo 2)
      const workersData = this.parserService.parseExcel(fileTrabajadores.path);
      this.parserService.validateHeaders(
        workersData,
        'trabajadores',
        IMPORT_TYPES.SECONDARY,
      );

      // Agrupar trabajadores por ID, manteniendo el registro con fecha más reciente
      const workersMap = new Map<string, any>();
      for (const w of workersData) {
        const trabajadorCombined =
          w[EXCEL_COLUMNS.TRABAJADOR_TIPO2.TRABAJADOR_COMBINED];
        if (!trabajadorCombined) continue;

        try {
          const parsed = this.parserService.parseWorkerCombined(
            String(trabajadorCombined),
          );
          const existingWorker = workersMap.get(parsed.id);

          // Mantener el registro más reciente
          if (
            !existingWorker ||
            new Date(String(w[EXCEL_COLUMNS.TRABAJADOR_TIPO2.FECHA_INICIO])) >
              new Date(String(existingWorker.fecha))
          ) {
            workersMap.set(parsed.id, {
              id: parsed.id,
              nombre: parsed.nombre,
              apellidos: parsed.apellidos,
              puesto: parsed.puesto,
              fecha: w[EXCEL_COLUMNS.TRABAJADOR_TIPO2.FECHA_INICIO],
              equal: 0, // No existe en tipo 2, se asigna 0
            });
          }
        } catch (error) {
          this.logger.warn(
            `Error parseando trabajador: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      const workersEntities = Array.from(workersMap.values()).map((w: any) => {
        const apellidos = String(w.apellidos).split(' ');
        return this.workerRepo.create({
          session,
          excelId: Number(w.id),
          nombre: w.nombre,
          apellido1: apellidos[0] || '',
          apellido2: apellidos.slice(1).join(' ') || '',
          puesto: w.puesto,
          equal: w.equal,
        });
      });
      await queryRunner.manager.save(workersEntities);

      // 3. Parsear y Guardar Fichajes (tipo 2: columna "Trabajador" en lugar de "Cód. trabajador")
      const clockInsData = this.parserService.parseExcel(fileFichajes.path);
      this.parserService.validateHeaders(
        clockInsData,
        'fichajes',
        IMPORT_TYPES.SECONDARY,
      );

      const clockInsEntities = clockInsData
        .filter((c) => c[EXCEL_COLUMNS.FICHAJE_TIPO2.ID_TRABAJADOR] != null)
        .map((c) => {
          const evento: string = c[EXCEL_COLUMNS.FICHAJE_TIPO2.EVENTO];
          const tipo = evento?.toLowerCase().includes('entrada')
            ? TipoFichaje.ENTRADA
            : TipoFichaje.SALIDA;

          return this.clockInRepo.create({
            session,
            workerId: c[EXCEL_COLUMNS.FICHAJE_TIPO2.ID_TRABAJADOR],
            timestamp: new Date(
              c[EXCEL_COLUMNS.FICHAJE_TIPO2.FECHA_HORA] as string,
            ),
            tipo,
          });
        });
      await queryRunner.manager.save(clockInsEntities);

      // 4. Parsear Rutas con Documento (TXT) si existe
      let rutasConDocumento = new Set<number>();
      if (fileRutasDocumento && fileRutasDocumento.size > 0) {
        if (!this.textParserService.validateTextFile(fileRutasDocumento.path)) {
          throw new BadRequestException(
            'Formato inválido en archivo de rutas con documento. Esperado: "Hoja {numero}.{extension}"',
          );
        }
        rutasConDocumento = this.textParserService.parseTextFile(
          fileRutasDocumento.path,
        );
      }

      // 5. Parsear y Guardar Rutas (tipo 2: unificadas)
      const rutasData = this.parserService.parseExcel(fileRutas.path);
      this.parserService.validateHeaders(
        rutasData,
        'rutas',
        IMPORT_TYPES.SECONDARY,
      );

      const routesEntities = rutasData
        .filter((r) => {
          const equipo = r[EXCEL_COLUMNS.RUTA_TIPO2.EQUIPO];
          return (
            equipo !== null &&
            equipo !== undefined &&
            String(equipo).trim() !== ''
          );
        })
        .flatMap((r) => {
          let workerId = r[EXCEL_COLUMNS.RUTA_TIPO2.TRABAJADOR];
          if (typeof workerId === 'string' && workerId.includes('-')) {
            workerId = parseInt(workerId.split('-')[0].trim(), 10);
          }

          const hojaRuta = Number(r[EXCEL_COLUMNS.RUTA_TIPO2.HOJARUTA]);
          const tieneDocumento = rutasConDocumento.has(hojaRuta) ? 1 : 0;

          const baseRoute = {
            session,
            fechaGeneral: new Date(r[EXCEL_COLUMNS.RUTA_TIPO2.FECHA] as string),
            codigoParte: r[EXCEL_COLUMNS.RUTA_TIPO2.HOJARUTA],
            servicio: r[EXCEL_COLUMNS.RUTA_TIPO2.SERVICIO],
            turno: r[EXCEL_COLUMNS.RUTA_TIPO2.TURNO],
            equipo: r[EXCEL_COLUMNS.RUTA_TIPO2.EQUIPO],
            inicio: new Date(r[EXCEL_COLUMNS.RUTA_TIPO2.INICIO] as string),
            fin: new Date(r[EXCEL_COLUMNS.RUTA_TIPO2.FIN] as string),
            vehiculo: '', // No existe en tipo 2
            kms: 0, // No existe en tipo 2
            esTitular: true, // En tipo 2 todas las rutas son "titulares"
            partesAsociados: tieneDocumento,
          };

          // Array de rutas a crear (titular + auxiliares)
          const routesToCreate: ScheduledRoute[] = [];

          // Ruta del trabajador titular
          routesToCreate.push(
            this.routeRepo.create({
              ...baseRoute,
              workerId: Number(workerId),
            }),
          );

          // Ruta del auxiliar 1 si existe
          const auxiliar1 = r[EXCEL_COLUMNS.RUTA_TIPO2.AUXILIAR1];
          if (auxiliar1) {
            let auxiliar1Id: number = Number(auxiliar1);
            if (typeof auxiliar1 === 'string' && auxiliar1.includes('-')) {
              auxiliar1Id = parseInt(auxiliar1.split('-')[0].trim(), 10);
            }
            routesToCreate.push(
              this.routeRepo.create({
                ...baseRoute,
                workerId: auxiliar1Id,
              }),
            );
          }

          // Ruta del auxiliar 2 si existe
          const auxiliar2 = r[EXCEL_COLUMNS.RUTA_TIPO2.AUXILIAR2];
          if (auxiliar2) {
            let auxiliar2Id: number = Number(auxiliar2);
            if (typeof auxiliar2 === 'string' && auxiliar2.includes('-')) {
              auxiliar2Id = parseInt(auxiliar2.split('-')[0].trim(), 10);
            }
            routesToCreate.push(
              this.routeRepo.create({
                ...baseRoute,
                workerId: auxiliar2Id,
              }),
            );
          }

          return routesToCreate;
        });
      const savedRoutes = await queryRunner.manager.save(routesEntities);

      // 6. Lógica de Casación (Matching)
      const { results, usedClockInIds } = this.matchingService.match(
        session,
        savedRoutes,
        clockInsEntities,
      );

      await queryRunner.manager.save(results);

      // 7. Lógica de Sin Rutas
      const unmatchedResults = this.matchingService.matchSinRutas(
        session,
        clockInsEntities,
        usedClockInIds,
      );
      await queryRunner.manager.save(unmatchedResults);

      await queryRunner.commitTransaction();

      return {
        success: true,
        sessionId: session.id,
        stats: {
          totalRutas: savedRoutes.length,
          procesados: results.length,
          conflictos: results.filter((r: PresenceResult) => r.revisar).length,
          rutasConDocumento: rutasConDocumento.size,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('ERROR DETALLADO PROCESANDO ARCHIVOS TIPO 2:', error);
      this.logger.error(
        'Error procesando archivos secundarios',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    } finally {
      await queryRunner.release();
      this._deleteFiles([
        fileTrabajadores,
        fileFichajes,
        fileRutas,
        fileRutasDocumento,
      ]);
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
   * Maneja archivos opcionales (null/undefined).
   */
  private _deleteFiles(files: (Express.Multer.File | undefined)[] | null) {
    if (!files) return;
    files.forEach((file) => {
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  }
}
