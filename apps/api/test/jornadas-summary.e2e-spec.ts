/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ImportSession } from '../src/newdatabase/jornadas/entities/import-session.entity';
import { ScheduledRoute } from '../src/newdatabase/jornadas/entities/scheduled-route.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../src/newdatabase/jornadas/entities/presence-result.entity';
import { seedDatabase } from './e2e-setup';

describe('Jornadas Service Summary (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sessionRepo: Repository<ImportSession>;
  let routeRepo: Repository<ScheduledRoute>;
  let resultRepo: Repository<PresenceResult>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(getDataSourceToken('new'));
    sessionRepo = app.get(getRepositoryToken(ImportSession, 'new'));
    routeRepo = app.get(getRepositoryToken(ScheduledRoute, 'new'));
    resultRepo = app.get(getRepositoryToken(PresenceResult, 'new'));

    // Limpiar y sembrar usuarios base (admin para login)
    await dataSource.synchronize(true);
    await seedDatabase(dataSource);

    // Login como admin
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'testadmin', password: 'adminpass' });
    token = loginRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/jornadas/:sessionId/service-summary (GET) - devuelve el resumen correcto por servicio', async () => {
    // 1. Crear sesión
    const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

    // 2. Crear rutas con diferentes duraciones y servicios
    // Ruta 1: Servicio A, 7 horas (1 jornada), con partes
    const r1 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P1',
        servicio: 'SERVICIO_A',
        turno: 'M',
        equipo: 'E1',
        inicio: new Date('2023-01-01T08:00:00Z'),
        fin: new Date('2023-01-01T15:00:00Z'),
        workerId: 1,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 1,
      }),
    );

    // Ruta 2: Servicio A, 3.5 horas (0.5 jornada), con partes
    const r2 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P2',
        servicio: 'SERVICIO_A',
        turno: 'T',
        equipo: 'E1',
        inicio: new Date('2023-01-01T15:00:00Z'),
        fin: new Date('2023-01-01T18:30:00Z'),
        workerId: 1,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 1,
      }),
    );

    // Ruta 3: Servicio B, 14 horas (2 jornadas), con partes
    const r3 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P3',
        servicio: 'SERVICIO_B',
        turno: 'M',
        equipo: 'E2',
        inicio: new Date('2023-01-01T08:00:00Z'),
        fin: new Date('2023-01-01T22:00:00Z'),
        workerId: 2,
        vehiculo: 'V2',
        kms: 0,
        partesAsociados: 1,
      }),
    );

    // Ruta 4: Servicio C, 7 horas, SIN partes (debe ser ignorada)
    const r4 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P4',
        servicio: 'SERVICIO_C',
        turno: 'M',
        equipo: 'E3',
        inicio: new Date('2023-01-01T08:00:00Z'),
        fin: new Date('2023-01-01T15:00:00Z'),
        workerId: 3,
        vehiculo: 'V3',
        kms: 0,
        partesAsociados: 0,
      }),
    );

    // 3. Crear resultados de presencia asociados a las rutas
    // El servicio query busca en PresenceResult, no en ScheduledRoute directamente
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

    // 4. Ejecutar la petición al endpoint
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get(`/jornadas/${session.id}/service-summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // 5. Verificar los cálculos
    const { rows, total } = response.body;

    // Esperamos:
    // SERVICIO_A: 1.0 + 0.5 = 1.5
    // SERVICIO_B: 2.0
    // SERVICIO_C: Ignorado (0)
    // Total: 3.5

    expect(rows).toHaveLength(2);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const servicioA = rows.find((r: any) => r.servicio === 'SERVICIO_A');
    expect(servicioA).toBeDefined();
    expect(servicioA.jornadas).toBe(1.5);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const servicioB = rows.find((r: any) => r.servicio === 'SERVICIO_B');
    expect(servicioB).toBeDefined();
    expect(servicioB.jornadas).toBe(2);

    expect(total).toBe(3.5);
  });
});
