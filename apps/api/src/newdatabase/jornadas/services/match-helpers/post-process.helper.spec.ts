import { ajustarHorarios, detectarDuplicados } from './post-process.helper';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';
import { ScheduledRoute } from '../../entities/scheduled-route.entity';

describe('PostProcessHelper', () => {
  // Helper para crear instancias mock de PresenceResult
  const createResult = (opts: {
    workerId?: number;
    start: string;
    end: string;
    equipo?: string;
    turno?: string;
    partes?: number;
    entrada?: string | null;
    salida?: string | null;
    fechaGeneral?: string;
  }): PresenceResult => {
    const start = new Date(opts.start);
    const end = new Date(opts.end);

    // fechaGeneral debe ser solo la fecha (sin hora)
    let fechaGeneral: Date;
    if (opts.fechaGeneral) {
      fechaGeneral = new Date(opts.fechaGeneral);
    } else {
      // Extraer solo la fecha del start (set time to 00:00:00)
      fechaGeneral = new Date(start);
      fechaGeneral.setHours(0, 0, 0, 0);
    }

    const route = {
      workerId: opts.workerId ?? 1,
      inicio: start,
      fin: end,
      equipo: opts.equipo ?? 'EQ1',
      turno: opts.turno ?? 'M',
      fechaGeneral,
      partesAsociados: opts.partes ?? 1,
    } as ScheduledRoute;

    return {
      route,
      fichajeEntrada: opts.entrada ? new Date(opts.entrada) : null,
      fichajeSalida: opts.salida ? new Date(opts.salida) : null,
      estado: EstadoPresencia.SIN_PRESENCIA, // Default, se actualizará en el test
      esDuplicado: false,
      revisar: false,
    } as PresenceResult;
  };

  describe('ajustarHorarios', () => {
    it('debería ajustar horarios para rutas consecutivas del mismo equipo (continuidad)', () => {
      // Ruta 1: 08:00 - 14:00. Tiene entrada 07:55.
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        entrada: '2023-10-25T07:55:00',
      });
      // Ruta 2: 14:00 - 20:00. Tiene salida 20:05.
      const r2 = createResult({
        start: '2023-10-25T14:00:00',
        end: '2023-10-25T20:00:00',
        salida: '2023-10-25T20:05:00',
      });

      ajustarHorarios([r1, r2]);

      // R1: Debe tener salida ajustada al fin de ruta (14:00) y estado calculado
      expect(r1.fichajeSalida).toEqual(r1.route.fin);
      expect(r1.estado).toBe(EstadoPresencia.COMPLETO);

      // R2: Debe tener entrada ajustada al inicio de ruta (14:00) y estado calculado
      expect(r2.fichajeEntrada).toEqual(r2.route.inicio);
      expect(r2.estado).toBe(EstadoPresencia.COMPLETO);
    });

    it('debería rellenar rutas intermedias como completas', () => {
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T10:00:00',
        entrada: '2023-10-25T08:00:00',
      });
      const r2 = createResult({
        start: '2023-10-25T10:00:00',
        end: '2023-10-25T12:00:00',
      }); // Sin fichajes
      const r3 = createResult({
        start: '2023-10-25T12:00:00',
        end: '2023-10-25T14:00:00',
        salida: '2023-10-25T14:00:00',
      });

      ajustarHorarios([r1, r2, r3]);

      // R2 (Intermedia) debe completarse automáticamente
      expect(r2.fichajeEntrada).toEqual(r2.route.inicio);
      expect(r2.fichajeSalida).toEqual(r2.route.fin);
      expect(r2.estado).toBe(EstadoPresencia.COMPLETO);
    });

    it('no debería agrupar si el hueco es mayor a la tolerancia (15 min default)', () => {
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        entrada: '2023-10-25T08:00:00',
      });
      // Hueco de 20 min
      const r2 = createResult({
        start: '2023-10-25T14:20:00',
        end: '2023-10-25T20:00:00',
        salida: '2023-10-25T20:00:00',
      });

      ajustarHorarios([r1, r2]);

      // No debe haber cambios
      expect(r1.fichajeSalida).toBeNull();
      expect(r2.fichajeEntrada).toBeNull();
    });

    it('debería agrupar aún siendo de equipos diferentes', () => {
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        equipo: 'A',
        entrada: '2023-10-25T08:00:00',
      });
      const r2 = createResult({
        start: '2023-10-25T14:00:00',
        end: '2023-10-25T20:00:00',
        equipo: 'B',
        salida: '2023-10-25T20:00:00',
      });

      ajustarHorarios([r1, r2]);

      expect(r1.fichajeSalida).not.toBeNull();
      expect(r2.fichajeEntrada).not.toBeNull();
    });

    it('no debería modificar rutas sin horario (inicio=fin) aunque sean consecutivas', () => {
      // Ruta 1: 08:00 - 14:00. Tiene entrada.
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        entrada: '2023-10-25T07:55:00',
      });

      // Ruta 2: 14:00 - 14:00 (Sin horario). Consecutiva. Tiene salida.
      const r2 = createResult({
        start: '2023-10-25T14:00:00',
        end: '2023-10-25T14:00:00',
        salida: '2023-10-25T14:30:00',
      });

      ajustarHorarios([r1, r2]);

      // R1 (Primero): Se ajusta salida porque tiene horario
      expect(r1.fichajeSalida).toEqual(r1.route.fin);
      expect(r1.estado).toBe(EstadoPresencia.COMPLETO);

      // R2 (Último): NO se debe ajustar entrada porque no tiene horario (inicio==fin)
      expect(r2.fichajeEntrada).toBeNull();
    });
  });

  describe('detectarDuplicados', () => {
    it('no debería marcar duplicados si no hay coincidencias', () => {
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        turno: 'M',
      });
      const r2 = createResult({
        start: '2023-10-25T15:00:00',
        end: '2023-10-25T20:00:00',
        turno: 'T',
      });

      detectarDuplicados([r1, r2]);

      expect(r1.esDuplicado).toBe(false);
      expect(r2.esDuplicado).toBe(false);
    });
    it('debería marcar duplicados dos registros con mismo equipo, turno y fecha, pero con horarios no coincidentes, pero no marcar revisión', () => {
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T10:00:00',
        turno: 'M',
        equipo: 'A',
      });
      const r2 = createResult({
        start: '2023-10-25T10:00:01',
        end: '2023-10-25T15:00:00',
        turno: 'M',
        equipo: 'A',
      });

      detectarDuplicados([r1, r2]);

      expect(r1.esDuplicado).toBe(true);
      expect(r2.esDuplicado).toBe(true);
      expect(r1.revisar).toBe(false);
      expect(r2.revisar).toBe(false);
    });
    it('debería marcar duplicados dos registros con mismo equipo, turno y fecha, y con horarios que tengan periodo de tiempo en común y también pedir revisión', () => {
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        turno: 'M',
        equipo: 'A',
      });
      const r2 = createResult({
        start: '2023-10-25T09:00:00',
        end: '2023-10-25T15:00:00',
        turno: 'M',
        equipo: 'A',
      });

      detectarDuplicados([r1, r2]);

      expect(r1.esDuplicado).toBe(true);
      expect(r2.esDuplicado).toBe(true);
      expect(r1.revisar).toBe(true);
      expect(r2.revisar).toBe(true);
    });
    it('debería pedir revisión si hay 2 duplicados con mismo turno y diferente equipo', () => {
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        turno: 'M',
        equipo: 'A',
      });
      const r2 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        turno: 'M',
        equipo: 'B',
      });

      detectarDuplicados([r1, r2]);

      expect(r1.esDuplicado).toBe(true);
      expect(r2.esDuplicado).toBe(true);
      expect(r1.revisar).toBe(true);
      expect(r2.revisar).toBe(true);
    });

    it('no debería pedir revisión si hay 2 duplicados y uno tiene partesAsociados = 0', () => {
      const r1 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        turno: 'M',
        partes: 1,
      });
      const r2 = createResult({
        start: '2023-10-25T08:00:00',
        end: '2023-10-25T14:00:00',
        turno: 'M',
        partes: 0,
      });

      detectarDuplicados([r1, r2]);

      expect(r1.esDuplicado).toBe(true);
      expect(r1.revisar).toBe(false);
    });
  });
});
