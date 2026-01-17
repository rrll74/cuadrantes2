import { limpiarCandidatos } from './clock-in.helper';
import { RawClockIn, TipoFichaje } from '../../entities/raw-clock-in.entity';

describe('ClockInHelper', () => {
  // Helper para crear instancias mock de RawClockIn
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

  describe('limpiarCandidatos', () => {
    it('debería devolver un array vacío si la entrada está vacía', () => {
      const result = limpiarCandidatos([]);
      expect(result).toEqual([]);
    });

    it('debería ordenar los fichajes cronológicamente', () => {
      const f1 = createClockIn(1, '2023-10-25T10:00:00', TipoFichaje.ENTRADA);
      const f2 = createClockIn(2, '2023-10-25T08:00:00', TipoFichaje.ENTRADA);

      const result = limpiarCandidatos([f1, f2]);

      expect(result[0].id).toBe(2); // 08:00
      expect(result[1].id).toBe(1); // 10:00
    });

    describe('Caso: Exactamente 2 fichajes', () => {
      it('debería corregir tipos si ambos son ENTRADA (1º -> Entrada, 2º -> Salida)', () => {
        const f1 = createClockIn(1, '2023-10-25T08:00:00', TipoFichaje.ENTRADA);
        const f2 = createClockIn(2, '2023-10-25T16:00:00', TipoFichaje.ENTRADA);

        const result = limpiarCandidatos([f1, f2]);

        expect(result).toHaveLength(2);
        expect(result[0].tipo).toBe(TipoFichaje.ENTRADA);
        expect(result[1].tipo).toBe(TipoFichaje.SALIDA);
      });

      it('debería corregir tipos si ambos son SALIDA (1º -> Entrada, 2º -> Salida)', () => {
        const f1 = createClockIn(1, '2023-10-25T08:00:00', TipoFichaje.SALIDA);
        const f2 = createClockIn(2, '2023-10-25T16:00:00', TipoFichaje.SALIDA);

        const result = limpiarCandidatos([f1, f2]);

        expect(result).toHaveLength(2);
        expect(result[0].tipo).toBe(TipoFichaje.ENTRADA);
        expect(result[1].tipo).toBe(TipoFichaje.SALIDA);
      });

      it('debería mantener los tipos si ya son correctos (Entrada, Salida)', () => {
        const f1 = createClockIn(1, '2023-10-25T08:00:00', TipoFichaje.ENTRADA);
        const f2 = createClockIn(2, '2023-10-25T16:00:00', TipoFichaje.SALIDA);

        const result = limpiarCandidatos([f1, f2]);

        expect(result[0].tipo).toBe(TipoFichaje.ENTRADA);
        expect(result[1].tipo).toBe(TipoFichaje.SALIDA);
      });
    });

    describe('Caso: Más de 2 fichajes', () => {
      it('debería filtrar ENTRADAS redundantes (mantener la más antigua)', () => {
        // 08:00, 08:15 (redundante < 30min), 09:00 (no redundante)
        const f1 = createClockIn(1, '2023-10-25T08:00:00', TipoFichaje.ENTRADA);
        const f2 = createClockIn(2, '2023-10-25T08:15:00', TipoFichaje.ENTRADA);
        const f3 = createClockIn(3, '2023-10-25T09:00:00', TipoFichaje.ENTRADA);

        const result = limpiarCandidatos([f1, f2, f3]);

        // Se espera que f2 sea eliminado (keep-earliest entre f1 y f2 -> f1)
        expect(result).toHaveLength(2);
        expect(result.map((r) => r.id)).toEqual([1, 3]);
      });

      it('debería filtrar SALIDAS redundantes (mantener la más reciente)', () => {
        // 16:00, 16:15 (redundante < 30min), 17:00 (no redundante)
        const f1 = createClockIn(1, '2023-10-25T16:00:00', TipoFichaje.SALIDA);
        const f2 = createClockIn(2, '2023-10-25T16:15:00', TipoFichaje.SALIDA);
        const f3 = createClockIn(3, '2023-10-25T17:00:00', TipoFichaje.SALIDA);

        const result = limpiarCandidatos([f1, f2, f3]);

        // Se espera que f1 sea eliminado (keep-latest entre f1 y f2 -> f2)
        // Luego f2 y f3 (>30min) -> ambos se quedan.
        expect(result).toHaveLength(2);
        expect(result.map((r) => r.id)).toEqual([2, 3]);
      });

      it('debería manejar una mezcla compleja de entradas y salidas', () => {
        // ENTRADA 08:00
        // ENTRADA 08:05 (redundante)
        // SALIDA 14:00
        // SALIDA 14:10 (redundante)
        const f1 = createClockIn(1, '2023-10-25T08:00:00', TipoFichaje.ENTRADA);
        const f2 = createClockIn(2, '2023-10-25T08:05:00', TipoFichaje.ENTRADA);
        const f3 = createClockIn(3, '2023-10-25T14:00:00', TipoFichaje.SALIDA);
        const f4 = createClockIn(4, '2023-10-25T14:10:00', TipoFichaje.SALIDA);

        const result = limpiarCandidatos([f1, f2, f3, f4]);

        expect(result).toHaveLength(2);
        // Entradas: f1 vs f2 -> keep earliest -> f1
        // Salidas: f3 vs f4 -> keep latest -> f4
        expect(result.find((r) => r.tipo === TipoFichaje.ENTRADA)?.id).toBe(1);
        expect(result.find((r) => r.tipo === TipoFichaje.SALIDA)?.id).toBe(4);
      });
    });
  });
});
