/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import {
  addHours,
  subHours,
  isWithinInterval,
  differenceInMinutes,
} from 'date-fns';
import { ImportSession } from './entities/import-session.entity';
import { ScheduledRoute } from './entities/scheduled-route.entity';
import { RawWorker } from './entities/raw-worker.entity';
import { RawClockIn, TipoFichaje } from './entities/raw-clock-in.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from './entities/presence-result.entity';
import {
  EXCEL_COLUMNS,
  CONFIG_JORNADAS,
  IResultadoPresencia,
} from '@cuadrantes/shared-dto';

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
    @InjectRepository(ImportSession)
    private sessionRepo: Repository<ImportSession>,
    @InjectRepository(ScheduledRoute)
    private routeRepo: Repository<ScheduledRoute>,
    @InjectRepository(RawWorker)
    private workerRepo: Repository<RawWorker>,
    @InjectRepository(RawClockIn)
    private clockInRepo: Repository<RawClockIn>,
    @InjectRepository(PresenceResult)
    private resultRepo: Repository<PresenceResult>,
    private dataSource: DataSource,
  ) {}

  async procesarArchivos(files: UploadedFiles, userId?: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Crear Sesión
      const session = this.sessionRepo.create({ userId });
      await queryRunner.manager.save(session);

      // 2. Parsear y Guardar Trabajadores
      const workersData = this.parseExcel(files.trabajadores[0].buffer);
      const workersEntities = workersData.map((w) =>
        this.workerRepo.create({
          session,
          excelId: w[EXCEL_COLUMNS.TRABAJADOR.ID],
          codigo: w['Código'] || '',
          nombre: w[EXCEL_COLUMNS.TRABAJADOR.NOMBRE],
          apellido1: w[EXCEL_COLUMNS.TRABAJADOR.APELLIDO1],
          apellido2: w[EXCEL_COLUMNS.TRABAJADOR.APELLIDO2],
          puesto: w[EXCEL_COLUMNS.TRABAJADOR.PUESTO],
          equal: w[EXCEL_COLUMNS.TRABAJADOR.EQUAL],
        }),
      );
      await queryRunner.manager.save(workersEntities);

      // 3. Parsear y Guardar Fichajes
      const clockInsData = this.parseExcel(files.fichajes[0].buffer);
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
      const titularesData = this.parseExcel(files.titulares[0].buffer);
      const auxiliaresData = this.parseExcel(files.auxiliares[0].buffer);

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

      // 5. Lógica de Casación (Matching)
      // Agrupar fichajes por trabajador para búsqueda rápida
      const fichajesMap = new Map<number, RawClockIn[]>();
      clockInsEntities.forEach((f) => {
        if (!fichajesMap.has(f.workerId)) {
          fichajesMap.set(f.workerId, []);
        }
        fichajesMap.get(f.workerId)?.push(f);
      });

      const results: PresenceResult[] = [];

      for (const route of savedRoutes) {
        const fichajesTrabajador = fichajesMap.get(route.workerId) || [];

        const { entrada, salida } = this.buscarCoincidenciaFichaje(
          route.inicio,
          route.fin,
          fichajesTrabajador,
        );

        const estado = this.calcularEstado(entrada, salida);

        const result = this.resultRepo.create({
          session,
          route,
          fichajeEntrada: entrada ? entrada.timestamp : null,
          fichajeSalida: salida ? salida.timestamp : null,
          estado,
          // La lógica de duplicados y revisar se puede refinar aquí o en un paso posterior
          esDuplicado: false,
          revisar: estado === EstadoPresencia.INCOMPLETO,
        });
        results.push(result);
      }

      // 6. Post-procesamiento: Lógica de Negocio (Ajustes y Duplicados)
      this.ajustarHorarios(results);
      this.detectarDuplicados(results);

      await queryRunner.manager.save(results);
      await queryRunner.commitTransaction();

      return {
        success: true,
        sessionId: session.id,
        stats: {
          totalRutas: savedRoutes.length,
          procesados: results.length,
          conflictos: results.filter((r) => r.revisar).length,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error procesando archivos', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private parseExcel(buffer: Buffer): any[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }

  private buscarCoincidenciaFichaje(
    inicioPlanificado: Date,
    finPlanificado: Date,
    fichajes: RawClockIn[],
  ): { entrada: RawClockIn | null; salida: RawClockIn | null } {
    const tolerancia = CONFIG_JORNADAS.TOLERANCIA_HORAS || 2;

    // Ventanas de búsqueda
    const ventanaEntradaInicio = subHours(inicioPlanificado, tolerancia);
    const ventanaEntradaFin = addHours(inicioPlanificado, tolerancia);

    const ventanaSalidaInicio = subHours(finPlanificado, tolerancia);
    const ventanaSalidaFin = addHours(finPlanificado, tolerancia);

    // Buscar Entrada: Tipo Entrada dentro de la ventana
    let entrada = fichajes.find(
      (f) =>
        f.tipo === TipoFichaje.ENTRADA &&
        isWithinInterval(f.timestamp, {
          start: ventanaEntradaInicio,
          end: ventanaEntradaFin,
        }),
    );

    // Buscar Salida: Tipo Salida dentro de la ventana
    let salida = fichajes.find(
      (f) =>
        f.tipo === TipoFichaje.SALIDA &&
        isWithinInterval(f.timestamp, {
          start: ventanaSalidaInicio,
          end: ventanaSalidaFin,
        }),
    );

    // Lógica de fallback (similar al script original):
    // Si no hay entrada explícita, buscar el fichaje más cercano al inicio que sea anterior
    if (!entrada) {
      const posibles = fichajes.filter(
        (f) =>
          Math.abs(differenceInMinutes(f.timestamp, inicioPlanificado)) <
          tolerancia * 60,
      );
      // Ordenar por cercanía
      posibles.sort(
        (a, b) =>
          Math.abs(differenceInMinutes(a.timestamp, inicioPlanificado)) -
          Math.abs(differenceInMinutes(b.timestamp, inicioPlanificado)),
      );
      if (posibles.length > 0) entrada = posibles[0];
    }

    // Si no hay salida explícita, buscar fichaje más cercano al fin
    if (!salida) {
      const posibles = fichajes.filter(
        (f) =>
          Math.abs(differenceInMinutes(f.timestamp, finPlanificado)) <
            tolerancia * 60 &&
          (entrada ? f.timestamp > entrada.timestamp : true), // Que sea posterior a la entrada
      );
      posibles.sort(
        (a, b) =>
          Math.abs(differenceInMinutes(a.timestamp, finPlanificado)) -
          Math.abs(differenceInMinutes(b.timestamp, finPlanificado)),
      );
      if (posibles.length > 0) salida = posibles[0];
    }

    return {
      entrada: entrada || null,
      salida: salida || null,
    };
  }

  private calcularEstado(
    entrada: RawClockIn | Date | null,
    salida: RawClockIn | Date | null,
  ): EstadoPresencia {
    if (entrada && salida) {
      return EstadoPresencia.COMPLETO;
    }
    if (entrada || salida) {
      return EstadoPresencia.INCOMPLETO;
    }
    return EstadoPresencia.SIN_PRESENCIA;
  }

  /**
   * Replica _ajustarHorariosDePresencia:
   * Agrupa por trabajador+fecha+equipo y ajusta entradas/salidas para dar continuidad.
   */
  private ajustarHorarios(results: PresenceResult[]) {
    // Agrupar
    const groups = new Map<string, PresenceResult[]>();

    results.forEach((r) => {
      const key = `${r.route.workerId}-${r.route.fechaGeneral.getTime()}-${r.route.equipo}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(r);
    });

    for (const group of groups.values()) {
      if (group.length <= 1) continue;

      // Ordenar por hora de inicio
      group.sort((a, b) => a.route.inicio.getTime() - b.route.inicio.getTime());

      const first = group[0];
      const last = group[group.length - 1];

      const fichajeEntrada = first.fichajeEntrada;
      const fichajeSalida = last.fichajeSalida;

      // Primera ruta: Mantiene su entrada real, Salida forzada al fin planificado
      if (fichajeEntrada) {
        first.fichajeSalida = first.route.fin;
        first.estado = this.calcularEstado(
          first.fichajeEntrada,
          first.fichajeSalida,
        );
      }

      // Última ruta: Entrada forzada al inicio planificado, Mantiene salida real
      if (fichajeSalida) {
        last.fichajeEntrada = last.route.inicio;
        last.estado = this.calcularEstado(
          last.fichajeEntrada,
          last.fichajeSalida,
        );
      }

      // Rutas intermedias: Se asumen completas (Inicio planificado -> Fin planificado)
      for (let i = 1; i < group.length - 1; i++) {
        const mid = group[i];
        mid.fichajeEntrada = mid.route.inicio;
        mid.fichajeSalida = mid.route.fin;
        mid.estado = EstadoPresencia.COMPLETO;
      }
    }
  }

  /**
   * Replica _identificarRutasDuplicadas:
   * Marca duplicados y decide si hay que revisar según reglas de negocio.
   */
  private detectarDuplicados(results: PresenceResult[]) {
    // Agrupar por trabajador+fecha+turno
    const groups = new Map<string, PresenceResult[]>();

    results.forEach((r) => {
      const key = `${r.route.workerId}-${r.route.fechaGeneral.getTime()}-${r.route.turno}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(r);
    });

    for (const group of groups.values()) {
      if (group.length <= 1) continue;

      // Marcar todos como duplicados
      group.forEach((r) => (r.esDuplicado = true));

      // Lógica para "revisar"
      const partesAsociadosCero = group.filter(
        (r) => r.route.partesAsociados === 0,
      ).length;
      const equiposUnicos = new Set(group.map((r) => r.route.equipo)).size;

      let revisar = true;

      // Caso 1: Son 2 rutas y al menos una tiene partesAsociados = 0
      if (group.length === 2 && partesAsociadosCero > 0) {
        revisar = false;
      }
      // Caso 2: Todos son del mismo equipo
      else if (equiposUnicos === 1) {
        revisar = false;
      }
      // Caso 3: Son 2 equipos distintos y al menos uno tiene partesAsociados = 0
      else if (equiposUnicos === 2 && partesAsociadosCero > 0) {
        revisar = false;
      }

      // Aplicar flag revisar solo si sigue siendo true (y si no estaba ya marcado por incompleto)
      if (revisar) {
        group.forEach((r) => (r.revisar = true));
      } else {
        // Si la lógica dice que no hay que revisar por duplicidad, mantenemos el estado previo (ej. si era incompleto)
        // O forzamos false si solo queremos revisar duplicados conflictivos.
        // Asumimos que 'revisar' es acumulativo, así que no lo ponemos a false si ya era true por otro motivo.
      }
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
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Resultados');

    // Definición de columnas
    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Servicio', key: 'servicio', width: 25 },
      { header: 'Turno', key: 'turno', width: 10 },
      { header: 'Equipo', key: 'equipo', width: 10 },
      { header: 'Trabajador', key: 'trabajador', width: 30 },
      { header: 'Inicio Plan.', key: 'inicio', width: 12 },
      { header: 'Fin Plan.', key: 'fin', width: 12 },
      { header: 'Entrada Real', key: 'entrada', width: 12 },
      { header: 'Salida Real', key: 'salida', width: 12 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Duplicado', key: 'duplicado', width: 10 },
      { header: 'Revisar', key: 'revisar', width: 10 },
    ];

    // Estilo Cabecera
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    results.forEach((res: IResultadoPresencia) => {
      const row = worksheet.addRow({
        fecha: res.ruta.fechaGeneral,
        servicio: res.ruta.servicio,
        turno: res.ruta.turno,
        equipo: res.ruta.equipo,
        trabajador: res.trabajador
          ? `${res.trabajador.nombre} ${res.trabajador.apellido1}`
          : 'Sin asignar',
        inicio: res.ruta.inicio,
        fin: res.ruta.fin,
        entrada: res.fichajeEntrada,
        salida: res.fichajeSalida,
        estado: res.estado,
        duplicado: res.esDuplicado ? 'SÍ' : '',
        revisar: res.revisar ? 'SÍ' : '',
      });

      // Formato de Fechas y Horas
      row.getCell('fecha').numFmt = 'dd/mm/yyyy';
      row.getCell('inicio').numFmt = 'hh:mm';
      row.getCell('fin').numFmt = 'hh:mm';
      row.getCell('entrada').numFmt = 'hh:mm';
      row.getCell('salida').numFmt = 'hh:mm';

      // Colores según estado
      const estadoCell = row.getCell('estado');
      let argb = 'FFFFFFFF'; // Blanco por defecto
      if ((res.estado as unknown) === EstadoPresencia.COMPLETO)
        argb = 'FFC6EFCE'; // Verde
      else if ((res.estado as unknown) === EstadoPresencia.INCOMPLETO)
        argb = 'FFFFEB9C'; // Amarillo
      else if ((res.estado as unknown) === EstadoPresencia.SIN_PRESENCIA)
        argb = 'FFFFC7CE'; // Rojo

      estadoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb },
      };

      // Alineación centrada para columnas cortas
      [
        'fecha',
        'turno',
        'equipo',
        'inicio',
        'fin',
        'entrada',
        'salida',
        'duplicado',
        'revisar',
      ].forEach((key) => {
        row.getCell(key).alignment = {
          vertical: 'middle',
          horizontal: 'center',
        };
      });
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
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
