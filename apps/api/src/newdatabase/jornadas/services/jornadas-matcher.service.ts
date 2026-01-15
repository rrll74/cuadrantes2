import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  addHours,
  subHours,
  isWithinInterval,
  differenceInMinutes,
  format,
  isSameDay,
} from 'date-fns';
import { CONFIG_JORNADAS } from '@cuadrantes/shared-dto';
import { ImportSession } from '../entities/import-session.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';
import { RawClockIn, TipoFichaje } from '../entities/raw-clock-in.entity';
import { UnmatchedResult } from '../entities/unmatched-result.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../entities/presence-result.entity';

@Injectable()
export class JornadasMatchingService {
  constructor(
    @InjectRepository(PresenceResult, 'new')
    private resultRepo: Repository<PresenceResult>,
    @InjectRepository(UnmatchedResult, 'new')
    private unmatchedRepo: Repository<UnmatchedResult>,
  ) {}

  /**
   * Realiza la casación (matching) entre las rutas planificadas y los fichajes reales.
   *
   * @param session La sesión de importación actual.
   * @param routes Lista de rutas planificadas extraídas de los archivos.
   * @param clockIns Lista de fichajes (entradas/salidas) extraídos.
   * @returns Objeto con resultados de presencia y un Set de IDs de fichajes utilizados.
   */
  match(
    session: ImportSession,
    routes: ScheduledRoute[],
    clockIns: RawClockIn[],
  ): { results: PresenceResult[]; usedClockInIds: Set<number> } {
    // 1. Agrupar fichajes por trabajador para optimizar la búsqueda (evita recorrer todo el array en cada iteración)
    // FIXME: Arreglar problema de que si un trabajador tica 2 veces entrada o 2 veces salida, que busque cuál es la inferior y la ponga como entrada y la otra como salida. Si hay varias entradas y salidas, que las ordene y que genere de manera que el primero sea entrada, el segundo salida, el tercero vuelta a entrar, el cuarto vuelta a salir, y así.
    const fichajesMap = new Map<number, RawClockIn[]>();
    clockIns.forEach((f) => {
      if (!fichajesMap.has(Number(f.workerId))) {
        fichajesMap.set(Number(f.workerId), []);
      }
      fichajesMap.get(Number(f.workerId))?.push(f);
    });

    const results: PresenceResult[] = [];
    const usedClockInIds = new Set<number>();

    // 2. Iterar sobre cada ruta planificada para encontrar sus fichajes correspondientes
    for (const route of routes) {
      const fichajesTrabajador = fichajesMap.get(route.workerId) || [];

      // Buscar fichajes que coincidan temporalmente con el inicio y fin de la ruta
      let { entrada, salida } = this.buscarCoincidenciaFichaje(
        route.inicio,
        route.fin,
        fichajesTrabajador,
      );

      // Condición especial: Si el horario planificado es nulo (inicio == fin) y el trabajador tiene presencia en el día
      // Se intenta asociar cualquier fichaje del día a esta ruta vacía para cumplir con el requisito de añadir la ruta con el trabajador
      if (route.inicio.getTime() === route.fin.getTime()) {
        const fichajesDia = fichajesTrabajador.filter((f) =>
          isSameDay(f.timestamp, route.fechaGeneral),
        );

        if (fichajesDia.length > 0) {
          // Si no se encontró entrada por proximidad, buscar la primera del día
          if (!entrada) {
            const entradas = fichajesDia
              .filter((f) => f.tipo === TipoFichaje.ENTRADA)
              .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            if (entradas.length > 0) entrada = entradas[0];
          }

          // Si no se encontró salida por proximidad, buscar la última del día
          if (!salida) {
            const salidas = fichajesDia
              .filter((f) => f.tipo === TipoFichaje.SALIDA)
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            if (salidas.length > 0) salida = salidas[0];
          }
        }
      }

      // Registrar los IDs de los fichajes utilizados
      if (entrada) usedClockInIds.add(entrada.id);
      if (salida) usedClockInIds.add(salida.id);

      // Determinar el estado (Completo, Incompleto, Sin Presencia)
      const estado = this.calcularEstado(entrada, salida);

      // Crear la entidad de resultado
      const result = this.resultRepo.create({
        session,
        route,
        fichajeEntrada: entrada ? entrada.timestamp : null,
        fichajeSalida: salida ? salida.timestamp : null,
        estado,
        esDuplicado: false,
        revisar: estado === EstadoPresencia.INCOMPLETO, // Marcar para revisar si falta algún fichaje
      });
      results.push(result);
    }

    // 3. Post-procesamiento: Ajustes lógicos de negocio
    this.ajustarHorarios(results); // Rellenar huecos en turnos continuos
    this.detectarDuplicados(results); // Identificar rutas duplicadas o conflictivas

    return { results, usedClockInIds };
  }

  /**
   * Genera resultados para los fichajes que no se asociaron a ninguna ruta.
   * Agrupa los fichajes restantes por trabajador y día, calculando entrada y salida.
   */
  matchSinRutas(
    session: ImportSession,
    clockIns: RawClockIn[],
    usedClockInIds: Set<number>,
  ): UnmatchedResult[] {
    // 1. Filtrar fichajes no utilizados
    const unusedClockIns = clockIns.filter((c) => !usedClockInIds.has(c.id));

    // 2. Agrupar por Trabajador + Fecha (YYYY-MM-DD)
    const groups = new Map<string, RawClockIn[]>();
    unusedClockIns.forEach((c) => {
      const dateStr = format(c.timestamp, 'yyyy-MM-dd');
      const key = `${c.workerId}_${dateStr}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(c);
    });

    const results: UnmatchedResult[] = [];

    // 3. Procesar cada grupo
    groups.forEach((fichajes, key) => {
      const [workerIdStr, dateStr] = key.split('_');
      const workerId = Number(workerIdStr);
      const fecha = new Date(dateStr);

      // Separar entradas y salidas y ordenar
      const entradas = fichajes
        .filter((f) => f.tipo === TipoFichaje.ENTRADA)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const salidas = fichajes
        .filter((f) => f.tipo === TipoFichaje.SALIDA)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Descendente para obtener la última

      const firstEntrada = entradas.length > 0 ? entradas[0] : null;
      const lastSalida = salidas.length > 0 ? salidas[0] : null;

      const estado = this.calcularEstado(firstEntrada, lastSalida);

      if (estado !== EstadoPresencia.SIN_PRESENCIA) {
        const result = this.unmatchedRepo.create({
          session,
          workerId,
          fecha,
          fichajeEntrada: firstEntrada ? firstEntrada.timestamp : null,
          fichajeSalida: lastSalida ? lastSalida.timestamp : null,
          estado,
        });
        results.push(result);
      }
    });

    return results;
  }

  /**
   * Busca un fichaje de entrada y uno de salida dentro de un margen de tolerancia
   * alrededor de las horas planificadas.
   *
   * @param inicioPlanificado Hora de inicio de la ruta.
   * @param finPlanificado Hora de fin de la ruta.
   * @param fichajes Lista de fichajes del trabajador específico.
   */
  private buscarCoincidenciaFichaje(
    inicioPlanificado: Date,
    finPlanificado: Date,
    fichajes: RawClockIn[],
  ): { entrada: RawClockIn | null; salida: RawClockIn | null } {
    const tolerancia = CONFIG_JORNADAS.TOLERANCIA_HORAS || 2;

    // Definir ventanas de tiempo para la búsqueda (ej. +/- 2 horas)
    const ventanaEntradaInicio = subHours(inicioPlanificado, tolerancia);
    const ventanaEntradaFin = addHours(inicioPlanificado, tolerancia);
    const ventanaSalidaInicio = subHours(finPlanificado, tolerancia);
    const ventanaSalidaFin = addHours(finPlanificado, tolerancia);

    let entrada = fichajes.find(
      (f) =>
        f.tipo === TipoFichaje.ENTRADA &&
        isWithinInterval(f.timestamp, {
          start: ventanaEntradaInicio,
          end: ventanaEntradaFin,
        }),
    );

    let salida = fichajes.find(
      (f) =>
        f.tipo === TipoFichaje.SALIDA &&
        isWithinInterval(f.timestamp, {
          start: ventanaSalidaInicio,
          end: ventanaSalidaFin,
        }),
    );

    // Fallback: Si no se encuentra entrada estricta, buscar la más cercana en tiempo
    // (sin importar tipo si los datos son sucios, o relajando condiciones)
    if (!entrada) {
      const posibles = fichajes.filter(
        (f) =>
          Math.abs(differenceInMinutes(f.timestamp, inicioPlanificado)) <
          tolerancia * 60,
      );
      // Ordenar por cercanía al horario planificado
      posibles.sort(
        (a, b) =>
          Math.abs(differenceInMinutes(a.timestamp, inicioPlanificado)) -
          Math.abs(differenceInMinutes(b.timestamp, inicioPlanificado)),
      );
      if (posibles.length > 0) entrada = posibles[0];
    }

    // Fallback para salida
    if (!salida) {
      const posibles = fichajes.filter(
        (f) =>
          Math.abs(differenceInMinutes(f.timestamp, finPlanificado)) <
            tolerancia * 60 &&
          (entrada ? f.timestamp > entrada.timestamp : true), // La salida debe ser posterior a la entrada
      );
      posibles.sort(
        (a, b) =>
          Math.abs(differenceInMinutes(a.timestamp, finPlanificado)) -
          Math.abs(differenceInMinutes(b.timestamp, finPlanificado)),
      );
      if (posibles.length > 0) salida = posibles[0];
    }

    return { entrada: entrada || null, salida: salida || null };
  }

  /**
   * Determina el estado de la presencia basándose en la existencia de fichajes.
   */
  private calcularEstado(
    entrada: RawClockIn | Date | null,
    salida: RawClockIn | Date | null,
  ): EstadoPresencia {
    if (entrada && salida) return EstadoPresencia.COMPLETO;
    if (entrada || salida) return EstadoPresencia.INCOMPLETO;
    return EstadoPresencia.SIN_PRESENCIA;
  }

  /**
   * Ajusta los horarios para trabajadores con múltiples rutas consecutivas (mismo equipo y día).
   * Si un trabajador tiene una secuencia de rutas, se asume continuidad.
   * - La primera ruta toma la entrada real.
   * - La última ruta toma la salida real.
   * - Las rutas intermedias se marcan como completas con los horarios planificados.
   */
  private ajustarHorarios(results: PresenceResult[]) {
    // Agrupar por trabajador + fecha + equipo
    const groups = new Map<string, PresenceResult[]>();
    results.forEach((r) => {
      const key = `${r.route.workerId}-${r.route.fechaGeneral.getTime()}-${r.route.equipo}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(r);
    });

    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      // Ordenar cronológicamente por hora de inicio
      group.sort((a, b) => a.route.inicio.getTime() - b.route.inicio.getTime());

      const first = group[0];
      const last = group[group.length - 1];

      // Ajuste del primero: Si tiene entrada, asumimos que cubre hasta el fin de su turno planificado
      if (first.fichajeEntrada) {
        first.fichajeSalida = first.route.fin;
        first.estado = this.calcularEstado(
          first.fichajeEntrada,
          first.fichajeSalida,
        );
      }
      // Ajuste del último: Si tiene salida, asumimos que empezó a la hora planificada
      if (last.fichajeSalida) {
        last.fichajeEntrada = last.route.inicio;
        last.estado = this.calcularEstado(
          last.fichajeEntrada,
          last.fichajeSalida,
        );
      }
      // Ajuste de intermedios: Se asumen completos automáticamente
      for (let i = 1; i < group.length - 1; i++) {
        group[i].fichajeEntrada = group[i].route.inicio;
        group[i].fichajeSalida = group[i].route.fin;
        group[i].estado = EstadoPresencia.COMPLETO;
      }
    }
  }

  /**
   * Detecta rutas duplicadas (mismo trabajador, fecha y turno) y aplica reglas de negocio
   * para determinar si requieren revisión manual.
   */
  private detectarDuplicados(results: PresenceResult[]) {
    // Agrupar por trabajador + fecha + turno
    const groups = new Map<string, PresenceResult[]>();
    results.forEach((r) => {
      const key = `${r.route.workerId}-${r.route.fechaGeneral.getTime()}-${r.route.turno}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(r);
    });

    for (const group of groups.values()) {
      if (group.length <= 1) continue;
      // Marcar todos como duplicados inicialmente
      group.forEach((r) => (r.esDuplicado = true));

      const partesAsociadosCero = group.filter(
        (r) => r.route.partesAsociados === 0,
      ).length;
      const equiposUnicos = new Set(group.map((r) => r.route.equipo)).size;

      let revisar = true;
      // Reglas para descartar falsos positivos o duplicados aceptables
      if (group.length === 2 && partesAsociadosCero > 0) revisar = false;
      else if (equiposUnicos === 1) revisar = false;
      else if (equiposUnicos === 2 && partesAsociadosCero > 0) revisar = false;

      if (revisar) group.forEach((r) => (r.revisar = true));
    }
  }
}
