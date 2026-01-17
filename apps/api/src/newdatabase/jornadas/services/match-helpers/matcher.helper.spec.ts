import {
  calcularEstado,
  obtenerCandidatos,
  buscarCoincidenciaFichaje,
} from './matcher.helper';
import { RawClockIn, TipoFichaje } from '../../entities/raw-clock-in.entity';
import { ScheduledRoute } from '../../entities/scheduled-route.entity';
import { EstadoPresencia } from '../../entities/presence-result.entity';

describe('MatcherHelper', () => {
  // --- Mocks y Helpers ---
  const createClockIn = (
    id: number,
    timeStr: string,
    tipo: TipoFichaje,
  ): RawClockIn => {
    return {
      id,
      timestamp: new Date(timeStr),
      tipo,
      workerId: 1,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      session: {} as any,
      createdAt: new Date(),
    } as unknown as RawClockIn;
  };

  const createRoute = (
    inicioStr: string,
    finStr: string,
    workerId = 1,
  ): ScheduledRoute => {
    return {
      id: 1,
      inicio: new Date(inicioStr),
      fin: new Date(finStr),
      workerId,
    } as ScheduledRoute;
  };

  // --- Tests ---

  describe('calcularEstado', () => {
    it('debería devolver COMPLETO si hay entrada y salida', () => {
      const entrada = new Date();
      const salida = new Date();
      expect(calcularEstado(entrada, salida)).toBe(EstadoPresencia.COMPLETO);
    });

    it('debería devolver INCOMPLETO si solo hay entrada', () => {
      const entrada = new Date();
      expect(calcularEstado(entrada, null)).toBe(EstadoPresencia.INCOMPLETO);
    });

    it('debería devolver INCOMPLETO si solo hay salida', () => {
      const salida = new Date();
      expect(calcularEstado(null, salida)).toBe(EstadoPresencia.INCOMPLETO);
    });

    it('debería devolver SIN_PRESENCIA si no hay ni entrada ni salida', () => {
      expect(calcularEstado(null, null)).toBe(EstadoPresencia.SIN_PRESENCIA);
    });
  });

  describe('obtenerCandidatos', () => {
    const fichajes = [
      createClockIn(1, '2023-10-25T05:00:00', TipoFichaje.ENTRADA), // Fuera (muy temprano)
      createClockIn(2, '2023-10-25T07:00:00', TipoFichaje.ENTRADA), // Dentro (tolerancia)
      createClockIn(3, '2023-10-25T16:00:00', TipoFichaje.SALIDA), // Dentro
      createClockIn(4, '2023-10-25T18:00:00', TipoFichaje.SALIDA), // Dentro (tolerancia)
      createClockIn(5, '2023-10-25T20:00:00', TipoFichaje.SALIDA), // Fuera (muy tarde)
    ];
    const ruta = createRoute('2023-10-25T08:00:00', '2023-10-25T17:00:00');
    // Ventana de búsqueda con tolerancia de 2h: 06:00 a 19:00

    it('debería devolver solo los fichajes dentro de la ventana de tolerancia', () => {
      const candidatos = obtenerCandidatos(ruta, fichajes, new Set());
      expect(candidatos.map((c) => c.id)).toEqual([2, 3, 4]);
    });

    it('debería excluir los fichajes cuyos IDs ya han sido utilizados', () => {
      const usedIds = new Set([3]);
      const candidatos = obtenerCandidatos(ruta, fichajes, usedIds);
      expect(candidatos.map((c) => c.id)).toEqual([2, 4]);
    });

    it('debería devolver un array vacío si no hay candidatos válidos', () => {
      const usedIds = new Set([2, 3, 4]);
      const candidatos = obtenerCandidatos(ruta, fichajes, usedIds);
      expect(candidatos).toHaveLength(0);
    });

    it('debería manejar correctamente turnos de noche', () => {
      const rutaNoche = createRoute(
        '2023-10-25T22:00:00',
        '2023-10-26T06:00:00',
      );
      // Ventana de búsqueda: 25-Oct 20:00 a 26-Oct 08:00
      const fichajesNoche = [
        createClockIn(1, '2023-10-25T19:00:00', TipoFichaje.ENTRADA), // Fuera
        createClockIn(2, '2023-10-25T21:45:00', TipoFichaje.ENTRADA), // Dentro
        createClockIn(3, '2023-10-26T05:50:00', TipoFichaje.SALIDA), // Dentro
        createClockIn(4, '2023-10-26T09:00:00', TipoFichaje.SALIDA), // Fuera
      ];
      const candidatos = obtenerCandidatos(rutaNoche, fichajesNoche, new Set());
      expect(candidatos.map((c) => c.id)).toEqual([2, 3]);
    });
  });

  describe('buscarCoincidenciaFichaje', () => {
    const inicioPlanificado = new Date('2023-10-25T08:00:00');
    const finPlanificado = new Date('2023-10-25T17:00:00');

    it('debería encontrar una entrada y salida que coincidan exactamente con el tipo', () => {
      const fichajes = [
        createClockIn(1, '2023-10-25T07:55:00', TipoFichaje.ENTRADA),
        createClockIn(2, '2023-10-25T17:05:00', TipoFichaje.SALIDA),
      ];
      const { entrada, salida } = buscarCoincidenciaFichaje(
        inicioPlanificado,
        finPlanificado,
        fichajes,
      );
      expect(entrada?.id).toBe(1);
      expect(salida?.id).toBe(2);
    });

    it('debería usar el fallback para encontrar la entrada más cercana si no hay tipo ENTRADA', () => {
      const fichajes = [
        createClockIn(1, '2023-10-25T08:10:00', TipoFichaje.SALIDA), // Tipo incorrecto pero cercano
        createClockIn(2, '2023-10-25T17:00:00', TipoFichaje.SALIDA),
      ];
      const { entrada, salida } = buscarCoincidenciaFichaje(
        inicioPlanificado,
        finPlanificado,
        fichajes,
      );
      expect(entrada?.id).toBe(1);
      expect(salida?.id).toBe(2);
    });

    it('debería usar el fallback para encontrar la salida más cercana', () => {
      const fichajes = [
        createClockIn(1, '2023-10-25T08:00:00', TipoFichaje.ENTRADA),
        createClockIn(2, '2023-10-25T16:50:00', TipoFichaje.ENTRADA), // Tipo incorrecto pero cercano
      ];
      const { entrada, salida } = buscarCoincidenciaFichaje(
        inicioPlanificado,
        finPlanificado,
        fichajes,
      );
      expect(entrada?.id).toBe(1);
      expect(salida?.id).toBe(2);
    });

    it('debería asegurarse de que la salida del fallback sea posterior a la entrada', () => {
      const fichajes = [
        createClockIn(1, '2023-10-25T08:00:00', TipoFichaje.ENTRADA),
        createClockIn(2, '2023-10-25T07:50:00', TipoFichaje.SALIDA), // Cercano al inicio, pero antes
        createClockIn(3, '2023-10-25T17:10:00', TipoFichaje.SALIDA), // Correcto
      ];
      const { entrada, salida } = buscarCoincidenciaFichaje(
        inicioPlanificado,
        finPlanificado,
        fichajes,
      );
      expect(entrada?.id).toBe(1);
      expect(salida?.id).toBe(3);
    });

    it('debería devolver null si no se encuentra ningún fichaje adecuado', () => {
      const fichajes = [
        createClockIn(1, '2023-10-25T02:00:00', TipoFichaje.ENTRADA),
        createClockIn(2, '2023-10-25T22:00:00', TipoFichaje.SALIDA),
      ];
      const { entrada, salida } = buscarCoincidenciaFichaje(
        inicioPlanificado,
        finPlanificado,
        fichajes,
      );
      expect(entrada).toBeNull();
      expect(salida).toBeNull();
    });
  });
});
