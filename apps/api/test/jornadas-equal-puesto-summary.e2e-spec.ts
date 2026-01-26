/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ImportSession } from '../src/newdatabase/jornadas/entities/import-session.entity';
import { ScheduledRoute } from '../src/newdatabase/jornadas/entities/scheduled-route.entity';
import { RawWorker } from '../src/newdatabase/jornadas/entities/raw-worker.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../src/newdatabase/jornadas/entities/presence-result.entity';
import { seedDatabase } from './e2e-setup';

describe('Jornadas Equal Puesto Summary (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sessionRepo: Repository<ImportSession>;
  let routeRepo: Repository<ScheduledRoute>;
  let workerRepo: Repository<RawWorker>;
  let resultRepo: Repository<PresenceResult>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Limpieza completa antes de usar los repositorios
    dataSource = app.get(getDataSourceToken('new'));
    await dataSource.synchronize(true);
    await seedDatabase(dataSource);

    sessionRepo = app.get(getRepositoryToken(ImportSession, 'new'));
    routeRepo = app.get(getRepositoryToken(ScheduledRoute, 'new'));
    workerRepo = app.get(getRepositoryToken(RawWorker, 'new'));
    resultRepo = app.get(getRepositoryToken(PresenceResult, 'new'));

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testadmin', password: 'adminpass' });
    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch (error) {
      // Ignora errores de cierre de la aplicación (problema común con TypeORM)
      console.warn('Error closing app:', (error as Error).message);
    }
  });

  it('/jornadas/:sessionId/equal-puesto-summary (GET) - devuelve el resumen correcto por puesto y equal', async () => {
    const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

    // 1. Crear trabajadores
    const w1 = await workerRepo.save(
      workerRepo.create({
        sessionId: session.id,
        excelId: 101,
        nombre: 'Juan',
        apellido1: 'Perez',
        puesto: 'Conductor',
        equal: 100,
      }),
    );

    const w2 = await workerRepo.save(
      workerRepo.create({
        sessionId: session.id,
        excelId: 102,
        nombre: 'Ana',
        apellido1: 'Gomez',
        puesto: 'Conductor', // Mismo puesto y equal que w1
        equal: 100,
      }),
    );

    const w3 = await workerRepo.save(
      workerRepo.create({
        sessionId: session.id,
        excelId: 103,
        nombre: 'Luis',
        apellido1: 'Lopez',
        puesto: 'Peon',
        equal: 50,
      }),
    );

    // 2. Crear rutas
    // R1 (W1): 7h, partes=1 => 1 jornada
    const r1 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P1',
        servicio: 'S1',
        turno: 'M',
        equipo: 'E1',
        inicio: new Date('2023-01-01T08:00:00Z'),
        fin: new Date('2023-01-01T15:00:00Z'),
        workerId: w1.excelId,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 1,
      }),
    );

    // R2 (W2): 3.5h, partes=1 => 0.5 jornada
    const r2 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P2',
        servicio: 'S1',
        turno: 'T',
        equipo: 'E1',
        inicio: new Date('2023-01-01T15:00:00Z'),
        fin: new Date('2023-01-01T18:30:00Z'),
        workerId: w2.excelId,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 1,
      }),
    );

    // R3 (W3): 14h, partes=1 => 2 jornadas
    const r3 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P3',
        servicio: 'S2',
        turno: 'M',
        equipo: 'E2',
        inicio: new Date('2023-01-01T08:00:00Z'),
        fin: new Date('2023-01-01T22:00:00Z'),
        workerId: w3.excelId,
        vehiculo: 'V2',
        kms: 0,
        partesAsociados: 1,
      }),
    );

    // R4 (W1): 7h, partes=0 => Ignorada
    const r4 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-02'),
        codigoParte: 'P4',
        servicio: 'S1',
        turno: 'M',
        equipo: 'E1',
        inicio: new Date('2023-01-02T08:00:00Z'),
        fin: new Date('2023-01-02T15:00:00Z'),
        workerId: w1.excelId,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 0,
      }),
    );

    // 3. Crear resultados de presencia
    await resultRepo.save([
      resultRepo.create({
        sessionId: session.id,
        route: r1,
        estado: EstadoPresencia.COMPLETO,
      }),
      resultRepo.create({
        sessionId: session.id,
        route: r2,
        estado: EstadoPresencia.COMPLETO,
      }),
      resultRepo.create({
        sessionId: session.id,
        route: r3,
        estado: EstadoPresencia.COMPLETO,
      }),
      resultRepo.create({
        sessionId: session.id,
        route: r4,
        estado: EstadoPresencia.COMPLETO,
      }),
    ]);

    // 4. Ejecutar petición
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get(`/jornadas/${session.id}/equal-puesto-summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { rows, total } = response.body;

    // Expected:
    // Conductor (100): 1.0 (R1) + 0.5 (R2) = 1.5
    // Peon (50): 2.0 (R3)
    // Total: 3.5

    expect(rows).toHaveLength(2);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const conductorRow = rows.find(
      (r: any) => r.puesto === 'Conductor' && r.equal === 100,
    );
    expect(conductorRow).toBeDefined();
    expect(conductorRow.jornadas).toBe(1.5);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const peonRow = rows.find(
      (r: any) => r.puesto === 'Peon' && r.equal === 50,
    );
    expect(peonRow).toBeDefined();
    expect(peonRow.jornadas).toBe(2);

    expect(total).toBe(3.5);
  });
});
