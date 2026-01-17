import {
  addHours,
  subHours,
  isWithinInterval,
  differenceInMinutes,
} from 'date-fns';
import { CONFIG_JORNADAS } from '@cuadrantes/shared-dto';
import { RawClockIn, TipoFichaje } from '../../entities/raw-clock-in.entity';
import { ScheduledRoute } from '../../entities/scheduled-route.entity';
import { EstadoPresencia } from '../../entities/presence-result.entity';

/**
 * Determina el estado de la presencia basándose en la existencia de fichajes.
 */
export function calcularEstado(
  entrada: RawClockIn | Date | null,
  salida: RawClockIn | Date | null,
): EstadoPresencia {
  if (entrada && salida) return EstadoPresencia.COMPLETO;
  if (entrada || salida) return EstadoPresencia.INCOMPLETO;
  return EstadoPresencia.SIN_PRESENCIA;
}

/**
 * Obtiene los fichajes que caen dentro de la ventana extendida de la ruta
 * y que no han sido utilizados previamente.
 */
export function obtenerCandidatos(
  route: ScheduledRoute,
  fichajes: RawClockIn[],
  usedIds: Set<number>,
): RawClockIn[] {
  const tolerancia = CONFIG_JORNADAS.TOLERANCIA_HORAS || 2;
  const startWindow = subHours(route.inicio, tolerancia);
  const endWindow = addHours(route.fin, tolerancia);

  return fichajes
    .filter(
      (f) =>
        !usedIds.has(f.id) &&
        isWithinInterval(f.timestamp, { start: startWindow, end: endWindow }),
    )
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

/**
 * Busca un fichaje de entrada y uno de salida dentro de un margen de tolerancia
 * alrededor de las horas planificadas.
 */
export function buscarCoincidenciaFichaje(
  inicioPlanificado: Date,
  finPlanificado: Date,
  fichajes: RawClockIn[],
): { entrada: RawClockIn | null; salida: RawClockIn | null } {
  const tolerancia = CONFIG_JORNADAS.TOLERANCIA_HORAS || 2;

  // Definir ventanas de tiempo para la búsqueda
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
  if (!entrada) {
    const posibles = fichajes.filter(
      (f) =>
        Math.abs(differenceInMinutes(f.timestamp, inicioPlanificado)) <
        tolerancia * 60,
    );
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
          tolerancia * 60 && (entrada ? f.timestamp > entrada.timestamp : true),
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
