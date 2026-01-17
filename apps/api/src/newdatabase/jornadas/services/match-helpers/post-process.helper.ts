import { differenceInMinutes } from 'date-fns';
import { CONFIG_JORNADAS } from '@cuadrantes/shared-dto';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';
import { calcularEstado } from './matcher.helper';

// FIXME: Arreglar 2 errores de asignación en casación.

// Que un mismo día, el mismo trabajador tenga una ruta en horario de A a B y otro de B a C (incluso otro más de C a D). El fichaje del trabajador se puede encuadrar en A y en D, por lo que el trabajador habría cubierto el horario en todas las rutas, sin embargo, según nuestro comportamiento, sólo quedaría reflejado el horario en la primera ruta y en la última de forma incompleta. Se debe rellenar el valor de A como la entrada inicial real, B como la salida de la planificación de ruta 1, C como entrada de la planificación de ruta 2 y D como la salida real de fichaje.
// Que trabajador haya realizado un horario de trabajo, sin embargo el horario de ruta es inferior a los fichajes de tolerancia de entrada o salida. Se debe marcar como salida real, la salida marcada en la ruta y se debe crear una nueva entrada a esa hora para que cuando se haga el listado de fichajes sin ruta se gener un estado de completocon el horario restante que el trabajador ha realizado.

// TODO: Agregar un campo horarioInferior del listado de casación que indique el porcentaje de jornada que se ha planificado de trabajo (para valorar el descuento de las jornadas que no sean completas, o dicho de otro modo, el conteo de las jornadas reales realizadas).

/**
 * Ajusta los horarios para trabajadores con múltiples rutas consecutivas.
 */
export function ajustarHorarios(results: PresenceResult[]) {
  // Obtener tolerancia de continuidad (default 15 min)
  const toleranciaContinuidad =
    (CONFIG_JORNADAS.TOLERANCIA_CONTINUIDAD_MINUTOS as number) || 15;

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

        // Considerar consecutivos si son del mismo equipo y el hueco es pequeño
        if (
          currentRoute.equipo === prevRoute.equipo &&
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

function aplicarAjusteContinuidad(group: PresenceResult[]) {
  const first = group[0];
  const last = group[group.length - 1];

  // Ajuste del primero
  if (
    first.fichajeEntrada &&
    first.route.inicio.getTime() !== first.route.fin.getTime()
  ) {
    first.fichajeSalida = first.route.fin;
    first.estado = calcularEstado(first.fichajeEntrada, first.fichajeSalida);
  }

  // Ajuste del último
  if (
    last.fichajeSalida &&
    last.route.inicio.getTime() !== last.route.fin.getTime()
  ) {
    last.fichajeEntrada = last.route.inicio;
    last.estado = calcularEstado(last.fichajeEntrada, last.fichajeSalida);
  }

  // Ajuste de intermedios
  for (let k = 1; k < group.length - 1; k++) {
    const current = group[k];
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
  const groups = new Map<string, PresenceResult[]>();
  results.forEach((r) => {
    const key = `${r.route.workerId}-${r.route.fechaGeneral.getTime()}-${r.route.turno}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(r);
  });

  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    group.forEach((r) => (r.esDuplicado = true));

    const partesAsociadosCero = group.filter(
      (r) => r.route.partesAsociados === 0,
    ).length;
    const equiposUnicos = new Set(group.map((r) => r.route.equipo)).size;

    let revisar = true;
    if (group.length === 2 && partesAsociadosCero > 0) revisar = false;
    else if (equiposUnicos === 1) revisar = false;
    else if (equiposUnicos === 2 && partesAsociadosCero > 0) revisar = false;

    if (revisar) group.forEach((r) => (r.revisar = true));
  }
}
