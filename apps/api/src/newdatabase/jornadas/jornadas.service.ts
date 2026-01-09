/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as fs from 'fs';
import { ImportSession } from './entities/import-session.entity';
import { ScheduledRoute } from './entities/scheduled-route.entity';
import { RawWorker } from './entities/raw-worker.entity';
import { RawClockIn, TipoFichaje } from './entities/raw-clock-in.entity';
import { PresenceResult } from './entities/presence-result.entity';
import { EXCEL_COLUMNS, IResultadoPresencia } from '@cuadrantes/shared-dto';
import { JornadasParserService } from './services/jornadas-parser.service';
import { JornadasMatchingService } from './services/jornadas-matcher.service';
import { JornadasExportService } from './services/jornadas-export.service';

interface UploadedFiles {
  titulares: Express.Multer.File[];
  auxiliares: Express.Multer.File[];
  trabajadores: Express.Multer.File[];
  fichajes: Express.Multer.File[];
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
    @InjectDataSource('new')
    private dataSource: DataSource,
    private parserService: JornadasParserService,
    private matchingService: JornadasMatchingService,
    private exportService: JornadasExportService,
  ) {}

  async procesarArchivos(files: UploadedFiles, userId?: number) {
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
      throw new BadRequestException('Los archivos son requeridos');
    }

    try {
      // 1. Crear Sesión
      const session = this.sessionRepo.create({ userId });
      await queryRunner.manager.save(session);

      // 2. Parsear y Guardar Trabajadores
      const workersData = this.parserService.parseExcel(fileTrabajadores.path);
      const workersEntities = workersData.map((w) =>
        this.workerRepo.create({
          session,
          excelId: w[EXCEL_COLUMNS.TRABAJADOR.ID] || 0,
          codigo: w['Código'] || '',
          nombre: w[EXCEL_COLUMNS.TRABAJADOR.NOMBRE],
          apellido1: w[EXCEL_COLUMNS.TRABAJADOR.APELLIDO1],
          apellido2: w[EXCEL_COLUMNS.TRABAJADOR.APELLIDO2] || '',
          puesto: w[EXCEL_COLUMNS.TRABAJADOR.PUESTO] || '',
          equal: w[EXCEL_COLUMNS.TRABAJADOR.EQUAL] || '0',
        }),
      );
      await queryRunner.manager.save(workersEntities);

      // 3. Parsear y Guardar Fichajes
      const clockInsData = this.parserService.parseExcel(fileFichajes.path);
      const clockInsEntities = clockInsData.map((c) => {
        // Normalizar tipo de fichaje
        const evento: string = c[EXCEL_COLUMNS.FICHAJE.EVENTO];
        const tipo = evento?.toLowerCase().includes('entrada')
          ? TipoFichaje.ENTRADA
          : TipoFichaje.SALIDA;

        return this.clockInRepo.create({
          session,
          workerId: c[EXCEL_COLUMNS.FICHAJE.ID_TRABAJADOR],
          timestamp: new Date(c[EXCEL_COLUMNS.FICHAJE.FECHA_HORA]),
          tipo,
        });
      });
      await queryRunner.manager.save(clockInsEntities);

      // 4. Parsear y Guardar Rutas (Titulares y Auxiliares)
      const titularesData = this.parserService.parseExcel(fileTitulares.path);
      const auxiliaresData = this.parserService.parseExcel(fileAuxiliares.path);

      const mapRoute = (r: any, esTitular: boolean) => {
        // Lógica para extraer ID del trabajador del string "ID - Nombre" si es necesario
        // Asumimos que la columna trae el ID limpio o aplicamos limpieza
        let workerId = r['Id trabajador'];
        if (typeof workerId === 'string' && workerId.includes('-')) {
          workerId = parseInt(workerId.split('-')[0].trim(), 10);
        }

        return this.routeRepo.create({
          session,
          fechaGeneral: new Date(r[EXCEL_COLUMNS.RUTA.FECHA]),
          codigoParte: r['Código parte'] || '',
          servicio: r[EXCEL_COLUMNS.RUTA.SERVICIO],
          turno: r[EXCEL_COLUMNS.RUTA.TURNO],
          equipo: r['Equipo'] || '',
          inicio: new Date(r[EXCEL_COLUMNS.RUTA.INICIO]),
          fin: new Date(r[EXCEL_COLUMNS.RUTA.FIN]),
          workerId: Number(workerId),
          vehiculo: r['Vehículo'] || '',
          kms: Number(r['Kms'] || 0),
          esTitular,
          partesAsociados: Number(r['Partes asociados'] || 0),
        });
      };

      const routesEntities = [
        ...titularesData.map((r) => mapRoute(r, true)),
        ...auxiliaresData.map((r) => mapRoute(r, false)),
      ];
      const savedRoutes = await queryRunner.manager.save(routesEntities);

      // 5. Lógica de Casación (Matching) delegada al servicio
      const results = this.matchingService.match(
        session,
        savedRoutes,
        clockInsEntities,
      );

      await queryRunner.manager.save(results);
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
      deleteFiles([
        fileTrabajadores,
        fileFichajes,
        fileTitulares,
        fileAuxiliares,
      ]);
    }
  }

  // Método auxiliar para obtener resultados para el frontend
  async getSessionResults(sessionId: number): Promise<IResultadoPresencia[]> {
    const results = await this.resultRepo.find({
      where: { sessionId },
      relations: ['route'],
      order: {
        route: {
          fechaGeneral: 'ASC',
          inicio: 'ASC',
        },
      },
    });
    // Cargar trabajadores en memoria para mapear rápidamente
    const workers = await this.workerRepo.find({ where: { sessionId } });
    const workersMap = new Map(workers.map((w) => [w.excelId, w]));

    return results.map((r) => ({
      ruta: { ...r.route },
      trabajador: workersMap.get(r.route.workerId) || null,
      fichajeEntrada: r.fichajeEntrada,
      fichajeSalida: r.fichajeSalida,
      estado: r.estado,
      esDuplicado: r.esDuplicado,
      revisar: r.revisar,
    }));
  }

  async generateExcelExport(sessionId: number): Promise<Buffer> {
    const results = await this.getSessionResults(sessionId);
    return this.exportService.generateExcel(results);
  }

  async findAllSessions() {
    return this.sessionRepo
      .createQueryBuilder('session')
      .loadRelationCountAndMap('session.totalRutas', 'session.routes')
      .loadRelationCountAndMap('session.totalResultados', 'session.results')
      .orderBy('session.createdAt', 'DESC')
      .getMany();
  }
}
function deleteFiles(files) {
  files.forEach((file) => {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
}
