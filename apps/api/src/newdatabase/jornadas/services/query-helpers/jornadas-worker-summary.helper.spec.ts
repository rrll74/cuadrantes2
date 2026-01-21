import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JornadasWorkerSummaryHelper } from './jornadas-worker-summary.helper';
import { PresenceResult } from '../../entities/presence-result.entity';
import { RawWorker } from '../../entities/raw-worker.entity';
import { ImportSession } from '../../entities/import-session.entity';

describe('JornadasWorkerSummaryHelper', () => {
  let helper: JornadasWorkerSummaryHelper;
  let presenceRepo: Repository<PresenceResult>;
  let workerRepo: Repository<RawWorker>;
  let sessionRepo: Repository<ImportSession>;

  const mockPresenceRepo = {
    find: jest.fn(),
  };

  const mockWorkerRepo = {
    find: jest.fn(),
  };

  const mockSessionRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadasWorkerSummaryHelper,
        {
          provide: getRepositoryToken(PresenceResult, 'new'),
          useValue: mockPresenceRepo,
        },
        {
          provide: getRepositoryToken(RawWorker, 'new'),
          useValue: mockWorkerRepo,
        },
        {
          provide: getRepositoryToken(ImportSession, 'new'),
          useValue: mockSessionRepo,
        },
      ],
    }).compile();

    helper = module.get<JornadasWorkerSummaryHelper>(
      JornadasWorkerSummaryHelper,
    );
    presenceRepo = module.get(getRepositoryToken(PresenceResult, 'new'));
    workerRepo = module.get(getRepositoryToken(RawWorker, 'new'));
    sessionRepo = module.get(getRepositoryToken(ImportSession, 'new'));

    jest.clearAllMocks();
  });

  describe('getJornadasByEqualAndPuestoSummary', () => {
    const sessionId = 1;

    it('debería agrupar jornadas por puesto y equal', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 7h = 1 jornada
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].puesto).toBe('Conductor');
      expect(result.rows[0].equal).toBe(100);
      expect(result.rows[0].jornadas).toBe(1);
    });

    it('debería acumular jornadas para el mismo puesto y equal', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 7h = 1 jornada
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T15:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'), // 7h = 1 jornada
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].jornadas).toBe(2);
    });

    it('debería filtrar rutas sin partes asociados', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T15:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'),
            partesAsociados: 0, // Debe ignorarse
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].jornadas).toBe(1);
    });

    it('debería separar jornadas descontadas por servicio', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T15:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'),
            partesAsociados: 1,
            servicio: 'DISCOUNT',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 'discount',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].jornadas).toBe(1);
      expect(result.discountedRows).toHaveLength(1);
      expect(result.discountedRows[0].jornadas).toBe(1);
    });

    it('debería separar jornadas descontadas por equipo', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T15:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'NOCONTAR',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: 'nocontar',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.discountedRows).toHaveLength(1);
    });

    it('debería ordenar por puesto alfabéticamente y luego por equal descendente', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
        {
          route: {
            workerId: 200,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
        {
          route: {
            workerId: 300,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 50 },
        { excelId: 200, puesto: 'Ayudante', equal: 100 },
        { excelId: 300, puesto: 'Conductor', equal: 100 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      // Esperado: Ayudante(100), Conductor(100), Conductor(50)
      expect(result.rows[0].puesto).toBe('Ayudante');
      expect(result.rows[1].puesto).toBe('Conductor');
      expect(result.rows[1].equal).toBe(100);
      expect(result.rows[2].equal).toBe(50);
    });

    it('debería manejar trabajadores sin puesto', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: null, equal: 0 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows[0].puesto).toBe('Sin Puesto');
    });

    it('debería manejar trabajadores sin equal', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: null },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows[0].equal).toBe(0);
    });

    it('debería devolver sesión en resultado', async () => {
      const mockSession = {
        id: sessionId,
        name: 'Test',
        discountServices: '',
        discountTeams: '',
      };

      mockPresenceRepo.find.mockResolvedValue([]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockSessionRepo.findOne.mockResolvedValue(mockSession);

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.session).toEqual(mockSession);
    });

    it('debería devolver totales calculados correctamente', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 1 jornada
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T15:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'), // 1 jornada
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.total).toBe(2);
      expect(result.discountedTotal).toBe(0);
    });

    it('debería redondear jornadas a 2 decimales', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T08:00:01Z'), // 1 segundo = casi 0
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows[0].jornadas).toBeCloseTo(0, 2);
    });

    it('debería devolver arrays vacíos cuando no hay resultados válidos', async () => {
      mockPresenceRepo.find.mockResolvedValue([]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toEqual([]);
      expect(result.discountedRows).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.discountedTotal).toBe(0);
    });

    it('debería manejar múltiples trabajadores con diferentes puestos', async () => {
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
        {
          route: {
            workerId: 200,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
            servicio: 'S1',
            equipo: 'E1',
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
        { excelId: 200, puesto: 'Ayudante', equal: 50 },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toHaveLength(2);
      expect(result.rows.some((r) => r.puesto === 'Conductor')).toBe(true);
      expect(result.rows.some((r) => r.puesto === 'Ayudante')).toBe(true);
    });
  });
});
