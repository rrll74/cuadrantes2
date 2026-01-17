import { differenceInMinutes } from 'date-fns';
import { RawClockIn, TipoFichaje } from '../../entities/raw-clock-in.entity';

/**
 * Aplica reglas de limpieza y corrección a los fichajes candidatos de una ruta.
 * 1. Si hay exactamente 2 fichajes del mismo tipo, corrige el primero a ENTRADA y el segundo a SALIDA.
 * 2. Si hay más de 2 fichajes, elimina redundancias (entradas/salidas muy seguidas).
 */
export function limpiarCandidatos(fichajes: RawClockIn[]): RawClockIn[] {
  if (!fichajes || fichajes.length === 0) return [];

  // Asegurar orden cronológico
  fichajes.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Caso 1: Exactamente 2 fichajes
  if (fichajes.length === 2) {
    const [f1, f2] = fichajes;
    if (f1.tipo === f2.tipo) {
      f1.tipo = TipoFichaje.ENTRADA;
      f2.tipo = TipoFichaje.SALIDA;
    }
    return fichajes;
  }

  // Caso 2: Más de 2 fichajes
  if (fichajes.length > 2) {
    const entradas = filtrarRedundantes(
      fichajes.filter((f) => f.tipo === TipoFichaje.ENTRADA),
      30,
      'keep-earliest',
    );
    const salidas = filtrarRedundantes(
      fichajes.filter((f) => f.tipo === TipoFichaje.SALIDA),
      30,
      'keep-latest',
    );

    // Recombinar y ordenar
    return [...entradas, ...salidas].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  return fichajes;
}

/**
 * Filtra fichajes del mismo tipo que están demasiado cerca en el tiempo.
 */
function filtrarRedundantes(
  lista: RawClockIn[],
  minutosTolerancia: number,
  estrategia: 'keep-earliest' | 'keep-latest',
): RawClockIn[] {
  if (lista.length < 2) return lista;

  const resultado: RawClockIn[] = [];
  let actual = lista[0];

  for (let i = 1; i < lista.length; i++) {
    const siguiente = lista[i];
    const diff = differenceInMinutes(siguiente.timestamp, actual.timestamp);

    if (diff < minutosTolerancia) {
      // Conflicto: Se elige según estrategia
      if (estrategia === 'keep-latest') {
        actual = siguiente; // Nos quedamos con el más reciente
      }
      // Si es 'keep-earliest', nos quedamos con 'actual' y descartamos 'siguiente'
    } else {
      // No hay conflicto, guardamos el actual y avanzamos
      resultado.push(actual);
      actual = siguiente;
    }
  }
  resultado.push(actual);

  return resultado;
}
