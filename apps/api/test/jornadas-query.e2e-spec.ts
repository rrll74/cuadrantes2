/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
import { RawWorker } from '../src/newdatabase/jornadas/entities/raw-worker.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../src/newdatabase/jornadas/entities/presence-result.entity';
import { UnmatchedResult } from '../src/newdatabase/jornadas/entities/unmatched-result.entity';
import { seedDatabase } from './e2e-setup';

describe('Jornadas Query Module (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let sessionRepo: Repository<ImportSession>;
  let routeRepo: Repository<ScheduledRoute>;
  let workerRepo: Repository<RawWorker>;
  let resultRepo: Repository<PresenceResult>;
  let unmatchedRepo: Repository<UnmatchedResult>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Limpiar y sembrar usuarios base (admin para login)
    dataSource = app.get(getDataSourceToken('new'));
    await dataSource.synchronize(true);
    await seedDatabase(dataSource);

    sessionRepo = app.get(getRepositoryToken(ImportSession, 'new'));
    routeRepo = app.get(getRepositoryToken(ScheduledRoute, 'new'));
    workerRepo = app.get(getRepositoryToken(RawWorker, 'new'));
    resultRepo = app.get(getRepositoryToken(PresenceResult, 'new'));
    unmatchedRepo = app.get(getRepositoryToken(UnmatchedResult, 'new'));

    // Login como admin
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

  describe('GET /jornadas/:sessionId/session-results', () => {
    it('debería devolver resultados de una sesión paginados', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      // Crear trabajador
      const worker = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 1,
          nombre: 'Juan',
          apellido1: 'Perez',
          apellido2: 'Lopez',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      // Crear ruta
      const route = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-01'),
          codigoParte: 'P1',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-01T08:00:00Z'),
          fin: new Date('2023-01-01T15:00:00Z'),
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      // Crear resultado de presencia
      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route,
          estado: EstadoPresencia.COMPLETO,
          fichajeEntrada: new Date('2023-01-01T08:00:00Z'),
          fichajeSalida: new Date('2023-01-01T15:00:00Z'),
        }),
      );

      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].trabajador.nombre).toBe('Juan');
      expect(response.body.stats.completo).toBe(1);
    });

    it('debería filtrar por búsqueda de nombre de trabajador', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      // Crear dos trabajadores
      const w1 = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 10,
          nombre: 'Juan',
          apellido1: 'Perez',
          apellido2: 'Lopez',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      const w2 = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 11,
          nombre: 'Maria',
          apellido1: 'Garcia',
          apellido2: 'Lopez',
          puesto: 'Ayudante',
          equal: 50,
        }),
      );

      // Crear rutas para ambos
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

      const r2 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-02'),
          codigoParte: 'P2',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-02T08:00:00Z'),
          fin: new Date('2023-01-02T15:00:00Z'),
          workerId: w2.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      // Crear resultados
      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: r1,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: r2,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      // Buscar solo a Juan
      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ search: 'Juan', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].trabajador.nombre).toBe('Juan');
    });

    it('debería filtrar por estado', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      const worker = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 20,
          nombre: 'Test',
          apellido1: 'Worker',
          apellido2: 'Test',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      const route = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-01'),
          codigoParte: 'P1',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-01T08:00:00Z'),
          fin: new Date('2023-01-01T15:00:00Z'),
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      // Crear dos resultados con diferentes estados
      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      const route2 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-02'),
          codigoParte: 'P2',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-02T08:00:00Z'),
          fin: new Date('2023-01-02T15:00:00Z'),
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: route2,
          estado: EstadoPresencia.INCOMPLETO,
        }),
      );

      // Filtrar solo COMPLETO
      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ status: EstadoPresencia.COMPLETO, page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].estado).toBe(EstadoPresencia.COMPLETO);
    });

    it('debería incluir estadísticas correctas en respuesta', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      const worker = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 30,
          nombre: 'Stats',
          apellido1: 'Test',
          apellido2: 'Worker',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      // Crear 3 rutas con diferentes estados
      const route1 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-01'),
          codigoParte: 'P1',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-01T08:00:00Z'),
          fin: new Date('2023-01-01T15:00:00Z'),
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      const route2 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-02'),
          codigoParte: 'P2',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-02T08:00:00Z'),
          fin: new Date('2023-01-02T15:00:00Z'),
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      const route3 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-03'),
          codigoParte: 'P3',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-03T08:00:00Z'),
          fin: new Date('2023-01-03T15:00:00Z'),
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: route1,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: route2,
          estado: EstadoPresencia.INCOMPLETO,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: route3,
          estado: EstadoPresencia.SIN_PRESENCIA,
        }),
      );

      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}`)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.stats.total).toBe(3);
      expect(response.body.stats.completo).toBe(1);
      expect(response.body.stats.incompleto).toBe(1);
      expect(response.body.stats.sinPresencia).toBe(1);
    });
  });

  describe('GET /jornadas/:sessionId/unmatched', () => {
    it('debería devolver resultados sin ruta paginados', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      const worker = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 100,
          nombre: 'Unmatched',
          apellido1: 'Worker',
          apellido2: 'Test',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      // Crear resultado sin ruta
      await unmatchedRepo.save(
        unmatchedRepo.create({
          sessionId: session.id,
          workerId: worker.excelId,
          fecha: new Date('2023-01-01'),
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}/unmatched`)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].trabajador.nombre).toBe('Unmatched');
    });
  });

  describe('GET /jornadas/:sessionId/unmatched/stats', () => {
    it('debería retornar estadísticas de resultados sin ruta', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      const w1 = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 110,
          nombre: 'Stats1',
          apellido1: 'Test',
          apellido2: 'Worker',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      const w2 = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 111,
          nombre: 'Stats2',
          apellido1: 'Test',
          apellido2: 'Worker',
          puesto: 'Ayudante',
          equal: 50,
        }),
      );

      // Crear resultados sin ruta
      await unmatchedRepo.save(
        unmatchedRepo.create({
          sessionId: session.id,
          workerId: w1.excelId,
          fecha: new Date('2023-01-01'),
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      await unmatchedRepo.save(
        unmatchedRepo.create({
          sessionId: session.id,
          workerId: w2.excelId,
          fecha: new Date('2023-01-02'),
          estado: EstadoPresencia.INCOMPLETO,
        }),
      );

      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}/unmatched/stats`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.byStatus[EstadoPresencia.COMPLETO]).toBe(1);
      expect(response.body.byStatus[EstadoPresencia.INCOMPLETO]).toBe(1);
      expect(response.body.byPuesto['Conductor']).toBe(1);
      expect(response.body.byPuesto['Ayudante']).toBe(1);
    });
  });

  describe('GET /jornadas', () => {
    it('debería retornar todas las sesiones con contadores', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      const worker = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 120,
          nombre: 'All',
          apellido1: 'Sessions',
          apellido2: 'Test',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      const route = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-01'),
          codigoParte: 'P1',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-01T08:00:00Z'),
          fin: new Date('2023-01-01T15:00:00Z'),
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/jornadas')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      const foundSession = response.body.find((s: any) => s.id === session.id);
      expect(foundSession).toBeDefined();
      expect(foundSession.totalRutas).toBe(1);
    });
  });

  describe('GET /jornadas/:sessionId/service-summary', () => {
    it('debería retornar sumario de jornadas por servicio', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      const worker = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 130,
          nombre: 'ServiceSum',
          apellido1: 'Test',
          apellido2: 'Worker',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      // Crear dos rutas con diferentes servicios
      const r1 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-01'),
          codigoParte: 'P1',
          servicio: 'SERVICIO_A',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-01T08:00:00Z'),
          fin: new Date('2023-01-01T15:00:00Z'), // 7h = 1 jornada
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      const r2 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-02'),
          codigoParte: 'P2',
          servicio: 'SERVICIO_B',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-02T08:00:00Z'),
          fin: new Date('2023-01-02T22:00:00Z'), // 14h = 2 jornadas
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: r1,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: r2,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}/service-summary`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.rows).toHaveLength(2);
      expect(response.body.total).toBe(3); // 1 + 2 jornadas
      const serviceA = response.body.rows.find(
        (r: any) => r.servicio === 'SERVICIO_A',
      );
      expect(serviceA.jornadas).toBe(1);
    });
  });

  describe('GET /jornadas/:sessionId/equal-puesto-summary', () => {
    it('debería retornar sumario de jornadas por puesto y equal', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      const w1 = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 140,
          nombre: 'Worker1',
          apellido1: 'Puesto',
          apellido2: 'Test',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      const w2 = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 141,
          nombre: 'Worker2',
          apellido1: 'Puesto',
          apellido2: 'Test',
          puesto: 'Ayudante',
          equal: 50,
        }),
      );

      const r1 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-01'),
          codigoParte: 'P1',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-01T08:00:00Z'),
          fin: new Date('2023-01-01T15:00:00Z'), // 1 jornada
          workerId: w1.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      const r2 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-02'),
          codigoParte: 'P2',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-02T08:00:00Z'),
          fin: new Date('2023-01-02T22:00:00Z'), // 2 jornadas
          workerId: w2.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: r1,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: r2,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}/equal-puesto-summary`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.rows).toHaveLength(2);
      expect(response.body.total).toBe(3); // 1 + 2 jornadas
      const conductor = response.body.rows.find(
        (r: any) => r.puesto === 'Conductor',
      );
      expect(conductor.jornadas).toBe(1);
    });
  });

  describe('GET /jornadas/:sessionId/status-parts-summary', () => {
    it('debería retornar resumen de estados separado por partes asociados', async () => {
      const session = await sessionRepo.save(sessionRepo.create({ userId: 1 }));

      const worker = await workerRepo.save(
        workerRepo.create({
          sessionId: session.id,
          excelId: 150,
          nombre: 'StatusParts',
          apellido1: 'Test',
          apellido2: 'Worker',
          puesto: 'Conductor',
          equal: 100,
        }),
      );

      // Ruta CON partes
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
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 1, // CON partes
        }),
      );

      // Ruta SIN partes
      const r2 = await routeRepo.save(
        routeRepo.create({
          sessionId: session.id,
          fechaGeneral: new Date('2023-01-02'),
          codigoParte: 'P2',
          servicio: 'S1',
          turno: 'M',
          equipo: 'E1',
          inicio: new Date('2023-01-02T08:00:00Z'),
          fin: new Date('2023-01-02T15:00:00Z'),
          workerId: worker.excelId,
          vehiculo: 'V1',
          kms: 0,
          partesAsociados: 0, // SIN partes
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: r1,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      await resultRepo.save(
        resultRepo.create({
          sessionId: session.id,
          route: r2,
          estado: EstadoPresencia.COMPLETO,
        }),
      );

      const response = await request(app.getHttpServer())
        .get(`/jornadas/${session.id}/status-parts-summary`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      const completoRow = response.body.rows.find(
        (r: any) => r.estado === EstadoPresencia.COMPLETO,
      );
      expect(completoRow.withPartsCount).toBe(1);
      expect(completoRow.noPartsCount).toBe(1);
      expect(response.body.footer.withPartsCount).toBe(1);
      expect(response.body.footer.noPartsCount).toBe(1);
    });
  });
});
