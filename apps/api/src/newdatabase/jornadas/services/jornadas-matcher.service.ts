import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  addHours,
  subHours,
  isWithinInterval,
  differenceInMinutes,
} from 'date-fns';
import { CONFIG_JORNADAS } from '@cuadrantes/shared-dto';
import { ImportSession } from '../entities/import-session.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';
import { RawClockIn, TipoFichaje } from '../entities/raw-clock-in.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../entities/presence-result.entity';

@Injectable()
export class JornadasMatchingService {
  constructor(
    @InjectRepository(PresenceResult, 'new')
    private resultRepo: Repository<PresenceResult>,
  ) {}

  /**
   * Realiza la casación (matching) entre las rutas planificadas y los fichajes reales.
   *
   * @param session La sesión de importación actual.
   * @param routes Lista de rutas planificadas extraídas de los archivos.
   * @param clockIns Lista de fichajes (entradas/salidas) extraídos.
   * @returns Un array de resultados de presencia (PresenceResult) listos para guardar.
   */
  match(
    session: ImportSession,
    routes: ScheduledRoute[],
    clockIns: RawClockIn[],
  ): PresenceResult[] {
    // 1. Agrupar fichajes por trabajador para optimizar la búsqueda (evita recorrer todo el array en cada iteración)
    const fichajesMap = new Map<number, RawClockIn[]>();
    clockIns.forEach((f) => {
      if (!fichajesMap.has(Number(f.workerId))) {
        fichajesMap.set(Number(f.workerId), []);
      }
      fichajesMap.get(Number(f.workerId))?.push(f);
    });

    const results: PresenceResult[] = [];

    // 2. Iterar sobre cada ruta planificada para encontrar sus fichajes correspondientes
    for (const route of routes) {
      const fichajesTrabajador = fichajesMap.get(route.workerId) || [];

      // Buscar fichajes que coincidan temporalmente con el inicio y fin de la ruta
      const { entrada, salida } = this.buscarCoincidenciaFichaje(
        route.inicio,
        route.fin,
        fichajesTrabajador,
      );

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
