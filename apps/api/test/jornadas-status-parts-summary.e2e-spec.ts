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
import {
  PresenceResult,
  EstadoPresencia,
} from '../src/newdatabase/jornadas/entities/presence-result.entity';
import { seedDatabase } from './e2e-setup';

describe('Jornadas Status Parts Summary (e2e)', () => {
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
    await dataSource.synchronize(true);
    await seedDatabase(dataSource);

    sessionRepo = app.get(getRepositoryToken(ImportSession, 'new'));
    routeRepo = app.get(getRepositoryToken(ScheduledRoute, 'new'));
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

  it('/jornadas/:sessionId/status-parts-summary (GET) - devuelve el resumen correcto por estado y partes', async () => {
    const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

    // 1. Crear rutas
    // R1: Con partes
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
        workerId: 1,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 1,
      }),
    );

    // R2: Sin partes
    const r2 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P2',
        servicio: 'S1',
        turno: 'M',
        equipo: 'E1',
        inicio: new Date('2023-01-01T08:00:00Z'),
        fin: new Date('2023-01-01T15:00:00Z'),
        workerId: 2,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 0,
      }),
    );

    // R3: Con partes
    const r3 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P3',
        servicio: 'S1',
        turno: 'M',
        equipo: 'E1',
        inicio: new Date('2023-01-01T08:00:00Z'),
        fin: new Date('2023-01-01T15:00:00Z'),
        workerId: 3,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 1,
      }),
    );

    // R4: Sin partes
    const r4 = await routeRepo.save(
      routeRepo.create({
        sessionId: session.id,
        fechaGeneral: new Date('2023-01-01'),
        codigoParte: 'P4',
        servicio: 'S1',
        turno: 'M',
        equipo: 'E1',
        inicio: new Date('2023-01-01T08:00:00Z'),
        fin: new Date('2023-01-01T15:00:00Z'),
        workerId: 4,
        vehiculo: 'V1',
        kms: 0,
        partesAsociados: 0,
      }),
    );

    // 2. Crear resultados
    await resultRepo.save([
      // R1 (Con partes) -> COMPLETO
      resultRepo.create({
        sessionId: session.id,
        route: r1,
        estado: EstadoPresencia.COMPLETO,
      }),
      // R2 (Sin partes) -> COMPLETO
      resultRepo.create({
        sessionId: session.id,
        route: r2,
        estado: EstadoPresencia.COMPLETO,
      }),
      // R3 (Con partes) -> INCOMPLETO
      resultRepo.create({
        sessionId: session.id,
        route: r3,
        estado: EstadoPresencia.INCOMPLETO,
      }),
      // R4 (Sin partes) -> SIN_PRESENCIA
      resultRepo.create({
        sessionId: session.id,
        route: r4,
        estado: EstadoPresencia.SIN_PRESENCIA,
      }),
    ]);

    // 3. Ejecutar petición
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const response = await request(app.getHttpServer())
      .get(`/jornadas/${session.id}/status-parts-summary`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { rows, footer } = response.body;

    // Expected:
    // With Parts:
    // - COMPLETO: 1 (R1) -> 50%
    // - INCOMPLETO: 1 (R3) -> 50%
    // - SIN_PRESENCIA: 0 -> 0%
    // Total With Parts: 2

    // Without Parts:
    // - COMPLETO: 1 (R2) -> 50%
    // - INCOMPLETO: 0 -> 0%
    // - SIN_PRESENCIA: 1 (R4) -> 50%
    // Total Without Parts: 2

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const completoRow = rows.find(
      (r: any) => r.estado === EstadoPresencia.COMPLETO,
    );
    expect(completoRow.withPartsCount).toBe(1);
    expect(completoRow.withPartsPercent).toBe(50);
    expect(completoRow.noPartsCount).toBe(1);
    expect(completoRow.noPartsPercent).toBe(50);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const incompletoRow = rows.find(
      (r: any) => r.estado === EstadoPresencia.INCOMPLETO,
    );
    expect(incompletoRow.withPartsCount).toBe(1);
    expect(incompletoRow.withPartsPercent).toBe(50);
    expect(incompletoRow.noPartsCount).toBe(0);
    expect(incompletoRow.noPartsPercent).toBe(0);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const sinPresenciaRow = rows.find(
      (r: any) => r.estado === EstadoPresencia.SIN_PRESENCIA,
    );
    expect(sinPresenciaRow.withPartsCount).toBe(0);
    expect(sinPresenciaRow.withPartsPercent).toBe(0);
    expect(sinPresenciaRow.noPartsCount).toBe(1);
    expect(sinPresenciaRow.noPartsPercent).toBe(50);

    expect(footer.withPartsCount).toBe(2);
    expect(footer.noPartsCount).toBe(2);
  });
});
