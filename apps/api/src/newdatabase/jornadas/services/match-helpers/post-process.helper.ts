import { differenceInMinutes } from 'date-fns';
import { CONFIG_JORNADAS } from '@cuadrantes/shared-dto';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';
import { calcularEstado } from './matcher.helper';

// FIXME: Arreglar 1 errores de asignación en casación.

// Que trabajador haya realizado un horario de trabajo, sin embargo el horario de ruta es inferior a los fichajes de tolerancia de entrada o salida. Se debe marcar como salida real, la salida marcada en la ruta y se debe crear una nueva entrada a esa hora para que cuando se haga el listado de fichajes sin ruta se gener un estado de completocon el horario restante que el trabajador ha realizado.

/**
 * Ajusta los horarios para trabajadores con múltiples rutas consecutivas.
 */
export function ajustarHorarios(results: PresenceResult[]) {
  // Obtener tolerancia de continuidad (default 15 min)
  const toleranciaContinuidad =
    CONFIG_JORNADAS.TOLERANCIA_CONTINUIDAD_MINUTOS || 15;

  // 1. Agrupar todos los resultados por trabajador
  const resultsByWorker = new Map<number, PresenceResult[]>();
  results.forEach((r) => {
    if (!resultsByWorker.has(r.route.workerId)) {
      resultsByWorker.set(r.route.workerId, []);
    }
    resultsByWorker.get(r.route.workerId)?.push(r);
  });

  // 2. Para cada trabajador, encontrar bloques de turnos consecutivos
  for (const workerResults of resultsByWorker.values()) {
    if (workerResults.length <= 1) continue;

    // Ordenar cronológicamente
    workerResults.sort(
      (a, b) => a.route.inicio.getTime() - b.route.inicio.getTime(),
    );

    let i = 0;
    while (i < workerResults.length) {
      const consecutiveGroup: PresenceResult[] = [workerResults[i]];
      let j = i + 1;

      while (j < workerResults.length) {
        const prevRoute = consecutiveGroup[consecutiveGroup.length - 1].route;
        const currentRoute = workerResults[j].route;

        const gapInMinutes = differenceInMinutes(
          currentRoute.inicio,
          prevRoute.fin,
        );

        // Considerar consecutivos si el hueco es pequeño
        if (
          // currentRoute.equipo === prevRoute.equipo &&
          gapInMinutes >= 0 &&
          gapInMinutes < toleranciaContinuidad
        ) {
          consecutiveGroup.push(workerResults[j]);
          j++;
        } else {
          break;
        }
      }

      // 3. Aplicar la lógica de ajuste solo al grupo consecutivo
      if (consecutiveGroup.length > 1) {
        aplicarAjusteContinuidad(consecutiveGroup);
      }

      i = j;
    }
  }
}

/**
 * Este código implementa la lógica de "continuidad de jornada".
 *
 * Cuando un trabajador tiene varias rutas consecutivas (por ejemplo, una ruta de 08:00 a 10:00 y otra de 10:00
 * a 14:00), normalmente solo ficha al entrar a las 08:00 y al salir a las 14:00.
 *
 * @param group Grupo de fichajes del trabajador
 */

function aplicarAjusteContinuidad(group: PresenceResult[]) {
  const first = group[0];
  const last = group[group.length - 1];

  // --- PRIMER TRAMO ---
  // Si el trabajador fichó entrada al inicio de la cadena, asumimos que cubre hasta el final de este tramo
  // para conectar con el siguiente. Forzamos la salida al fin planificado de esta ruta.
  if (
    first.fichajeEntrada &&
    first.route.inicio.getTime() !== first.route.fin.getTime()
  ) {
    first.fichajeSalida = first.route.fin;
    first.estado = calcularEstado(first.fichajeEntrada, first.fichajeSalida);
  }

  // --- ÚLTIMO TRAMO ---
  // Si el trabajador fichó salida al final de la cadena, asumimos que viene trabajando desde el tramo anterior.
  // Forzamos la entrada al inicio planificado de esta ruta final.
  if (
    last.fichajeSalida &&
    last.route.inicio.getTime() !== last.route.fin.getTime()
  ) {
    last.fichajeEntrada = last.route.inicio;
    last.estado = calcularEstado(last.fichajeEntrada, last.fichajeSalida);
  }

  // --- TRAMOS INTERMEDIOS ---
  // Los tramos que quedan "en medio" (entre el primero y el último) se consideran totalmente cubiertos
  // por la continuidad del servicio. Se rellenan automáticamente con el horario planificado.
  for (let k = 1; k < group.length - 1; k++) {
    const current = group[k];
    // Solo aplicamos si la ruta tiene duración (inicio != fin)
    if (current.route.inicio.getTime() !== current.route.fin.getTime()) {
      current.fichajeEntrada = current.route.inicio;
      current.fichajeSalida = current.route.fin;
      current.estado = EstadoPresencia.COMPLETO;
    }
  }
}

/**
 * Detecta rutas duplicadas y aplica reglas de negocio.
 */
export function detectarDuplicados(results: PresenceResult[]) {
  // 1. Agrupación: Identificamos candidatos a duplicados por Trabajador + Fecha + Turno
  const groups = new Map<string, PresenceResult[]>();
  results.forEach((r) => {
    const key = `${r.route.workerId}-${r.route.fechaGeneral.getTime()}-${r.route.turno}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(r);
  });

  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    // 2. Marcado Inicial: Si hay más de una ruta para el mismo turno, es un duplicado técnico
    group.forEach((r) => (r.esDuplicado = true));

    const partesAsociadosCero = group.filter(
      (r) => r.route.partesAsociados === 0,
    ).length;
    const equiposUnicos = new Set(group.map((r) => r.route.equipo)).size;

    // 3. Lógica de Conflicto: Decidimos si requiere revisión manual
    let revisar = true;
    // Excepción 1: Rutas "vacías". Si hay 2 rutas y una no tiene partes (carga de trabajo),
    // asumimos que la válida es la que tiene partes.
    if (group.length === 2 && partesAsociadosCero > 0) revisar = false;
    // Excepción 2: Mismo Equipo. Si son del mismo equipo, es una organización interna válida.
    else if (equiposUnicos === 1) revisar = false;
    // Excepción 3: Diferentes equipos pero sin carga. Si son equipos distintos (conflicto)
    // pero una ruta está vacía, se ignora el conflicto.
    else if (equiposUnicos === 2 && partesAsociadosCero > 0) revisar = false;

    if (revisar) group.forEach((r) => (r.revisar = true));
  }
}
