import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JornadasMatchingService } from './jornadas-matcher.service';
import {
  PresenceResult,
  EstadoPresencia,
} from '../entities/presence-result.entity';
import { UnmatchedResult } from '../entities/unmatched-result.entity';
import { ImportSession } from '../entities/import-session.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';
import { RawClockIn, TipoFichaje } from '../entities/raw-clock-in.entity';

describe('JornadasMatchingService', () => {
  let service: JornadasMatchingService;
  let resultRepo: Repository<PresenceResult>;
  let unmatchedRepo: Repository<UnmatchedResult>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadasMatchingService,
        {
          provide: getRepositoryToken(PresenceResult, 'new'),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UnmatchedResult, 'new'),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<JornadasMatchingService>(JornadasMatchingService);
    resultRepo = module.get<Repository<PresenceResult>>(
      getRepositoryToken(PresenceResult, 'new'),
    );
    unmatchedRepo = module.get<Repository<UnmatchedResult>>(
      getRepositoryToken(UnmatchedResult, 'new'),
    );

    // Mock de create para devolver el objeto tal cual (simulando la entidad creada)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.spyOn(resultRepo, 'create').mockImplementation((dto: any) => dto);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    jest.spyOn(unmatchedRepo, 'create').mockImplementation((dto: any) => dto);
  });

  it('debería realizar el flujo completo de casación correctamente', () => {
    // 1. Datos de Prueba
    const session = { id: 1 } as ImportSession;
    const fechaBase = new Date('2023-11-01T00:00:00');

    // --- CASO 1: Trabajador con Turno Continuo (Mañana + Tarde) ---
    // Ruta 1: 08:00 - 14:00
    // Ruta 2: 14:00 - 20:00
    // Fichajes: 07:55 (Entrada), 20:05 (Salida) -> La continuidad debe rellenar los huecos intermedios
    const worker1Id = 100;
    const route1W1 = {
      id: 1,
      workerId: worker1Id,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ1',
      turno: 'M',
    } as ScheduledRoute;
    const route2W1 = {
      id: 2,
      workerId: worker1Id,
      inicio: new Date('2023-11-01T14:00:00'),
      fin: new Date('2023-11-01T20:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ1',
      turno: 'T',
    } as ScheduledRoute;

    const clockIn1W1 = {
      id: 1,
      workerId: worker1Id,
      timestamp: new Date('2023-11-01T07:55:00'),
      tipo: TipoFichaje.ENTRADA,
    } as RawClockIn;
    const clockIn2W1 = {
      id: 2,
      workerId: worker1Id,
      timestamp: new Date('2023-11-01T20:05:00'),
      tipo: TipoFichaje.SALIDA,
    } as RawClockIn;

    // --- CASO 2: Trabajador con Turno de Noche ---
    // Ruta: 22:00 - 06:00 (+1 día)
    // Fichajes: 21:50, 06:10
    const worker2Id = 200;
    const route1W2 = {
      id: 3,
      workerId: worker2Id,
      inicio: new Date('2023-11-01T22:00:00'),
      fin: new Date('2023-11-02T06:00:00'),
      fechaGeneral: new Date('2023-11-02T00:00:00'),
      equipo: 'EQ2',
      turno: 'N',
    } as ScheduledRoute;

    const clockIn1W2 = {
      id: 3,
      workerId: worker2Id,
      timestamp: new Date('2023-11-01T21:50:00'),
      tipo: TipoFichaje.ENTRADA,
    } as RawClockIn;
    const clockIn2W2 = {
      id: 4,
      workerId: worker2Id,
      timestamp: new Date('2023-11-02T06:10:00'),
      tipo: TipoFichaje.SALIDA,
    } as RawClockIn;

    // --- CASO 3: Trabajador Sin Presencia (Ausencia) ---
    const worker3Id = 300;
    const route1W3 = {
      id: 4,
      workerId: worker3Id,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T15:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ3',
    } as ScheduledRoute;

    // --- CASO 4: Fichajes Sin Ruta (Unmatched) ---
    // Fichaje suelto para Trabajador 1 fuera de sus rutas
    const clockInExtraW1 = {
      id: 5,
      workerId: worker1Id,
      timestamp: new Date('2023-11-01T23:00:00'),
      tipo: TipoFichaje.ENTRADA,
    } as RawClockIn;
    const clockInExtraW1Exit = {
      id: 6,
      workerId: worker1Id,
      timestamp: new Date('2023-11-01T23:30:00'),
      tipo: TipoFichaje.SALIDA,
    } as RawClockIn;

    const routes = [route1W1, route2W1, route1W2, route1W3];
    const clockIns = [
      clockIn1W1,
      clockIn2W1,
      clockIn1W2,
      clockIn2W2,
      clockInExtraW1,
      clockInExtraW1Exit,
    ];

    // 2. Ejecutar match
    const { results, usedClockInIds } = service.match(
      session,
      routes,
      clockIns,
    );

    // 3. Verificaciones de Match
    expect(results).toHaveLength(4);

    // Verificación Trabajador 1 (Continuidad)
    const resW1R1 = results.find((r) => r.route.id === 1);
    const resW1R2 = results.find((r) => r.route.id === 2);

    expect(resW1R1).toBeDefined();
    expect(resW1R1?.estado).toBe(EstadoPresencia.COMPLETO);
    // Entrada real
    expect(resW1R1?.fichajeEntrada).toEqual(clockIn1W1.timestamp);
    // Salida ajustada por continuidad (fin de ruta)
    expect(resW1R1?.fichajeSalida).toEqual(route1W1.fin);

    expect(resW1R2).toBeDefined();
    expect(resW1R2?.estado).toBe(EstadoPresencia.COMPLETO);
    // Entrada ajustada por continuidad (inicio de ruta)
    expect(resW1R2?.fichajeEntrada).toEqual(route2W1.inicio);
    // Salida real
    expect(resW1R2?.fichajeSalida).toEqual(clockIn2W1.timestamp);

    // Verificación Trabajador 2 (Noche)
    const resW2 = results.find((r) => r.route.id === 3);
    expect(resW2?.estado).toBe(EstadoPresencia.COMPLETO);
    expect(resW2?.fichajeEntrada).toEqual(clockIn1W2.timestamp);
    expect(resW2?.fichajeSalida).toEqual(clockIn2W2.timestamp);

    // Verificación Trabajador 3 (Sin Presencia)
    const resW3 = results.find((r) => r.route.id === 4);
    expect(resW3?.estado).toBe(EstadoPresencia.SIN_PRESENCIA);

    // 4. Ejecutar matchSinRutas
    const unmatched = service.matchSinRutas(session, clockIns, usedClockInIds);

    // 5. Verificaciones Unmatched
    expect(unmatched).toHaveLength(1);
    const unRes = unmatched[0];
    expect(unRes.workerId).toBe(worker1Id);
    expect(unRes.fichajeEntrada).toEqual(clockInExtraW1.timestamp);
    expect(unRes.fichajeSalida).toEqual(clockInExtraW1Exit.timestamp);
    expect(unRes.estado).toBe(EstadoPresencia.COMPLETO);
  });

  it('debería detectar rutas duplicadas (mismo turno y equipo) y marcarlas correctamente', () => {
    const session = { id: 1 } as ImportSession;
    const fechaBase = new Date('2023-11-01T00:00:00');
    const workerId = 500;

    // Dos rutas idénticas en cuanto a clave de duplicidad (mismo trabajador, fecha, turno)
    const route1 = {
      id: 10,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_DUP',
      turno: 'M',
      partesAsociados: 1,
    } as ScheduledRoute;

    const route2 = {
      id: 11,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'), // Mismo horario
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_DUP', // Mismo equipo
      turno: 'M',
      partesAsociados: 1,
    } as ScheduledRoute;

    const routes = [route1, route2];
    const clockIns: RawClockIn[] = []; // Sin fichajes para simplificar

    const { results } = service.match(session, routes, clockIns);

    expect(results).toHaveLength(2);

    const res1 = results.find((r) => r.route.id === 10);
    const res2 = results.find((r) => r.route.id === 11);

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();

    // Ambas deben marcarse como duplicadas
    expect(res1?.esDuplicado).toBe(true);
    expect(res2?.esDuplicado).toBe(true);

    // Al ser del mismo equipo y tener Overlap (horario coincidente), la lógica de negocio determina que SÍ requieren revisión manual
    expect(res1?.revisar).toBe(true);
    expect(res2?.revisar).toBe(true);
  });

  it('debería detectar rutas duplicadas conflictivas (diferente equipo) y marcar revisar: true', () => {
    const session = { id: 1 } as ImportSession;
    const fechaBase = new Date('2023-11-01T00:00:00');
    const workerId = 600;

    // Dos rutas duplicadas pero con diferente equipo -> Conflicto real
    const route1 = {
      id: 20,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_A',
      turno: 'M',
      partesAsociados: 1,
    } as ScheduledRoute;

    const route2 = {
      id: 21,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_B', // Diferente equipo
      turno: 'M',
      partesAsociados: 1,
    } as ScheduledRoute;

    const routes = [route1, route2];
    const clockIns: RawClockIn[] = [];

    const { results } = service.match(session, routes, clockIns);

    expect(results).toHaveLength(2);

    const res1 = results.find((r) => r.route.id === 20);
    const res2 = results.find((r) => r.route.id === 21);

    expect(res1).toBeDefined();
    expect(res2).toBeDefined();

    // Ambas deben marcarse como duplicadas y requerir revisión
    expect(res1?.esDuplicado).toBe(true);
    expect(res2?.esDuplicado).toBe(true);
    expect(res1?.revisar).toBe(true);
    expect(res2?.revisar).toBe(true);
  });

  it('debería asegurar que los fichajes utilizados en una ruta duplicada no se reutilizan en la otra', () => {
    const session = { id: 1 } as ImportSession;
    const fechaBase = new Date('2023-11-01T00:00:00');
    const workerId = 700;

    // Dos rutas idénticas (duplicadas)
    const route1 = {
      id: 30,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_DUP',
      turno: 'M',
    } as ScheduledRoute;

    const route2 = {
      id: 31,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_DUP',
      turno: 'M',
    } as ScheduledRoute;

    // Un solo par de fichajes válidos
    const clockIn1 = {
      id: 100,
      workerId,
      timestamp: new Date('2023-11-01T07:55:00'),
      tipo: TipoFichaje.ENTRADA,
    } as RawClockIn;
    const clockIn2 = {
      id: 101,
      workerId,
      timestamp: new Date('2023-11-01T14:05:00'),
      tipo: TipoFichaje.SALIDA,
    } as RawClockIn;

    const routes = [route1, route2];
    const clockIns = [clockIn1, clockIn2];

    const { results } = service.match(session, routes, clockIns);

    expect(results).toHaveLength(2);

    // Una ruta debe tener los fichajes (COMPLETO) y la otra no (SIN_PRESENCIA)
    const resConFichajes = results.find(
      (r) => r.estado === EstadoPresencia.COMPLETO,
    );
    const resSinFichajes = results.find(
      (r) => r.estado === EstadoPresencia.SIN_PRESENCIA,
    );

    expect(resConFichajes).toBeDefined();
    expect(resSinFichajes).toBeDefined();

    // Verificar que efectivamente son las rutas que definimos
    expect([30, 31]).toContain(resConFichajes?.route.id);
    expect([30, 31]).toContain(resSinFichajes?.route.id);

    // Ambas deberían marcarse como duplicadas
    expect(resConFichajes?.esDuplicado).toBe(true);
    expect(resSinFichajes?.esDuplicado).toBe(true);
  });

  it('debería repartir múltiples pares de fichajes entre rutas duplicadas si están disponibles', () => {
    const session = { id: 1 } as ImportSession;
    const fechaBase = new Date('2023-11-01T00:00:00');
    const workerId = 800;

    // Dos rutas idénticas (duplicadas)
    const route1 = {
      id: 40,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_DUP',
      turno: 'M',
      partesAsociados: 1,
    } as ScheduledRoute;

    const route2 = {
      id: 41,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T14:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_DUP',
      turno: 'M',
      partesAsociados: 1,
    } as ScheduledRoute;

    // Par 1 de fichajes
    const clockIn1 = {
      id: 200,
      workerId,
      timestamp: new Date('2023-11-01T07:55:00'),
      tipo: TipoFichaje.ENTRADA,
    } as RawClockIn;
    const clockIn2 = {
      id: 201,
      workerId,
      timestamp: new Date('2023-11-01T14:05:00'),
      tipo: TipoFichaje.SALIDA,
    } as RawClockIn;

    // Par 2 de fichajes (ligeramente desplazados pero válidos)
    const clockIn3 = {
      id: 202,
      workerId,
      timestamp: new Date('2023-11-01T08:05:00'),
      tipo: TipoFichaje.ENTRADA,
    } as RawClockIn;
    const clockIn4 = {
      id: 203,
      workerId,
      timestamp: new Date('2023-11-01T13:55:00'),
      tipo: TipoFichaje.SALIDA,
    } as RawClockIn;

    const routes = [route1, route2];
    const clockIns = [clockIn1, clockIn2, clockIn3, clockIn4];

    const { results } = service.match(session, routes, clockIns);

    expect(results).toHaveLength(2);

    const res1 = results.find((r) => r.route.id === 40);
    const res2 = results.find((r) => r.route.id === 41);

    // Ambas rutas deben haber encontrado fichajes (COMPLETO)
    expect(res1?.estado).toBe(EstadoPresencia.COMPLETO);
    expect(res2?.estado).toBe(EstadoPresencia.COMPLETO);

    // Verificar que no comparten fichajes (IDs diferentes implican timestamps diferentes en este caso)
    expect(res1?.fichajeEntrada).not.toEqual(res2?.fichajeEntrada);
    expect(res1?.fichajeSalida).not.toEqual(res2?.fichajeSalida);
  });

  it('debería recoger correctamente fichajes de todo el día para una ruta sin horario (inicio == fin)', () => {
    const session = { id: 1 } as ImportSession;
    const fechaBase = new Date('2023-11-01T00:00:00');
    const workerId = 900;

    // Ruta con horario puntual (inicio == fin), ej: 08:00 - 08:00
    // Esto indica que no hay horario definido y debe coger lo que encuentre en el día
    const route = {
      id: 50,
      workerId,
      inicio: new Date('2023-11-01T08:00:00'),
      fin: new Date('2023-11-01T08:00:00'),
      fechaGeneral: fechaBase,
      equipo: 'EQ_SIN_HORARIO',
      turno: 'M',
    } as ScheduledRoute;

    // Fichajes realizados durante el día (fuera del "punto" 08:00)
    const clockInEntry = {
      id: 300,
      workerId,
      timestamp: new Date('2023-11-01T09:00:00'),
      tipo: TipoFichaje.ENTRADA,
    } as RawClockIn;

    const clockInExit = {
      id: 301,
      workerId,
      timestamp: new Date('2023-11-01T17:00:00'),
      tipo: TipoFichaje.SALIDA,
    } as RawClockIn;

    const routes = [route];
    const clockIns = [clockInEntry, clockInExit];

    const { results } = service.match(session, routes, clockIns);

    expect(results).toHaveLength(1);
    const res = results[0];

    expect(res.estado).toBe(EstadoPresencia.COMPLETO);
    expect(res.fichajeEntrada).toEqual(clockInEntry.timestamp);
    expect(res.fichajeSalida).toEqual(clockInExit.timestamp);
  });
});
