import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { format, isSameDay } from 'date-fns';
import { ImportSession } from '../entities/import-session.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';
import { RawClockIn, TipoFichaje } from '../entities/raw-clock-in.entity';
import { UnmatchedResult } from '../entities/unmatched-result.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../entities/presence-result.entity';
import { limpiarCandidatos } from './match-helpers/clock-in.helper';
import {
  obtenerCandidatos,
  buscarCoincidenciaFichaje,
  calcularEstado,
} from './match-helpers/matcher.helper';
import {
  ajustarHorarios,
  detectarDuplicados,
} from './match-helpers/post-process.helper';

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
    const fichajesMap = new Map<number, RawClockIn[]>();
    clockIns.forEach((f) => {
      if (!fichajesMap.has(Number(f.workerId))) {
        fichajesMap.set(Number(f.workerId), []);
      }
      fichajesMap.get(Number(f.workerId))?.push(f);
    });

    // Ordenar rutas para priorizar las que tienen horario definido y evitar que las "sin horario" roben fichajes
    const sortedRoutes = [...routes].sort((a, b) => {
      const aTieneHorario = a.inicio.getTime() !== a.fin.getTime();
      const bTieneHorario = b.inicio.getTime() !== b.fin.getTime();

      // Prioridad 1: Rutas con horario definido antes que las de punto/fecha
      if (aTieneHorario && !bTieneHorario) return -1;
      if (!aTieneHorario && bTieneHorario) return 1;

      // Prioridad 2: Cronológica
      return a.inicio.getTime() - b.inicio.getTime();
    });

    const results: PresenceResult[] = [];
    const usedClockInIds = new Set<number>();

    // 2. Iterar sobre cada ruta planificada (ordenada)
    for (const route of sortedRoutes) {
      const fichajesTrabajador = fichajesMap.get(route.workerId) || [];
      const esSinHorario = route.inicio.getTime() === route.fin.getTime();

      // Determinar candidatos iniciales
      let candidatos: RawClockIn[];

      if (esSinHorario) {
        // Para rutas sin horario (inicio == fin), consideramos todos los fichajes del día no utilizados
        candidatos = fichajesTrabajador
          .filter(
            (f) =>
              !usedClockInIds.has(f.id) &&
              isSameDay(f.timestamp, route.fechaGeneral),
          )
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      } else {
        // Para rutas con horario O rutas puntuales con hora definida, usamos la ventana de tolerancia
        candidatos = obtenerCandidatos(
          route,
          fichajesTrabajador,
          usedClockInIds,
        );
      }

      // Limpiar candidatos (corrección de tipos, eliminación de duplicados cercanos)
      candidatos = limpiarCandidatos(candidatos);

      let entrada: RawClockIn | null = null;
      let salida: RawClockIn | null = null;

      if (esSinHorario) {
        // Lógica específica para rutas sin horario: primera entrada y última salida de los candidatos limpios
        if (candidatos.length > 0) {
          const entradas = candidatos.filter(
            (f) => f.tipo === TipoFichaje.ENTRADA,
          );
          if (entradas.length > 0) entrada = entradas[0];

          const salidas = candidatos.filter(
            (f) => f.tipo === TipoFichaje.SALIDA,
          );
          if (salidas.length > 0) salida = salidas[salidas.length - 1];
        }
      } else {
        // Buscar fichajes que coincidan temporalmente con el inicio y fin de la ruta
        const match = buscarCoincidenciaFichaje(
          route.inicio,
          route.fin,
          candidatos,
        );
        entrada = match.entrada;
        salida = match.salida;
      }

      // Registrar los IDs de los fichajes utilizados
      if (entrada) usedClockInIds.add(entrada.id);
      if (salida) usedClockInIds.add(salida.id);

      // Determinar el estado (Completo, Incompleto, Sin Presencia)
      const estado = calcularEstado(entrada, salida);

      // Crear la entidad de resultado
      const result = this.resultRepo.create({
        session,
        route,
        fichajeEntrada: entrada ? entrada.timestamp : null,
        fichajeSalida: salida ? salida.timestamp : null,
        estado,
        esDuplicado: false,
        revisar: false,
      });
      results.push(result);
    }

    // 3. Post-procesamiento: Ajustes lógicos de negocio
    ajustarHorarios(results); // Rellenar huecos en turnos continuos
    detectarDuplicados(results); // Identificar rutas duplicadas o conflictivas

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

      const estado = calcularEstado(firstEntrada, lastSalida);

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
}
