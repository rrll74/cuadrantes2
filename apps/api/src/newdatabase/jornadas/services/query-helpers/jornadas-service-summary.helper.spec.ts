import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JornadasServiceSummaryHelper } from './jornadas-service-summary.helper';
import { PresenceResult } from '../../entities/presence-result.entity';
import { ImportSession } from '../../entities/import-session.entity';

describe('JornadasServiceSummaryHelper', () => {
  let helper: JornadasServiceSummaryHelper;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let presenceRepo: Repository<PresenceResult>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let sessionRepo: Repository<ImportSession>;

  const mockPresenceRepo = {
    find: jest.fn(),
  };

  const mockSessionRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadasServiceSummaryHelper,
        {
          provide: getRepositoryToken(PresenceResult, 'new'),
          useValue: mockPresenceRepo,
        },
        {
          provide: getRepositoryToken(ImportSession, 'new'),
          useValue: mockSessionRepo,
        },
      ],
    }).compile();

    helper = module.get<JornadasServiceSummaryHelper>(
      JornadasServiceSummaryHelper,
    );
    presenceRepo = module.get(getRepositoryToken(PresenceResult, 'new'));
    sessionRepo = module.get(getRepositoryToken(ImportSession, 'new'));

    jest.clearAllMocks();
  });

  describe('getJornadasByServiceSummary', () => {
    const sessionId = 1;

    it('debería devolver sumatorio de jornadas agrupadas por servicio', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 7h = 1 jornada
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'S1',
            equipo: 'E2',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'), // 14h = 2 jornadas
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.rows[0].jornadas).toBe(3); // 1 + 2 jornadas
      expect(result.total).toBe(3);
    });

    it('debería filtrar rutas sin partes asociados', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'S2',
            equipo: 'E2',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 0, // Debe ignorarse
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.total).toBe(1);
    });

    it('debería separar jornadas descontadas por servicio', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'DISCOUNT',
            equipo: 'E2',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'), // 14h = 2 jornadas
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 'discount',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.rows[0].jornadas).toBe(1);
      expect(result.total).toBe(1);

      expect(result.discountedRows).toHaveLength(1);
      expect(result.discountedRows[0].servicio).toBe('DISCOUNT');
      expect(result.discountedRows[0].jornadas).toBe(2);
      expect(result.discountedTotal).toBe(2);
    });

    it('debería separar jornadas descontadas por equipo', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'S1',
            equipo: 'NOCONTAR',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'), // 14h = 2 jornadas
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: 'nocontar',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.rows[0].jornadas).toBe(1);

      expect(result.discountedRows).toHaveLength(1);
      expect(result.discountedRows[0].jornadas).toBe(2);
    });

    it('debería ordear servicios alfabéticamente', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'Z',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'A',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows[0].servicio).toBe('A');
      expect(result.rows[1].servicio).toBe('Z');
    });

    it('debería redondear jornadas a 2 decimales', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T08:00:01Z'), // 1 segundo
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows[0].jornadas).toBeCloseTo(0, 2);
      expect(typeof result.rows[0].jornadas).toBe('number');
    });

    it('debería devolver sesión en resultado', async () => {
      const mockSession = {
        id: sessionId,
        name: 'Test Session',
        discountServices: '',
        discountTeams: '',
      };

      mockPresenceRepo.find.mockResolvedValue([]);
      mockSessionRepo.findOne.mockResolvedValue(mockSession);

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.session).toEqual(mockSession);
    });

    it('debería devolver totales separados correctamente', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 1 jornada
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'S2',
            equipo: 'E2',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T22:00:00Z'), // 2 jornadas
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.total).toBe(3); // 1 + 2
      expect(result.discountedTotal).toBe(0);
    });

    it('debería manejar servicios sin nombre', async () => {
      const mockResults = [
        {
          route: {
            servicio: null,
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows[0].servicio).toBe('Sin Servicio');
    });

    it('debería aplicar filtro case-insensitive para servicios descontados', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'SERVICE1',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 'service1',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toHaveLength(0);
      expect(result.discountedRows).toHaveLength(1);
    });

    it('debería devolver arrays vacíos cuando no hay resultados', async () => {
      mockPresenceRepo.find.mockResolvedValue([]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toEqual([]);
      expect(result.discountedRows).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.discountedTotal).toBe(0);
    });

    it('debería procesar múltiples servicios descontados separados por comas', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'NODISCOUNT',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'ALSONOCOUNT',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 'noDiscount, alsoNoCount',
        discountTeams: '',
      });

      const result = await helper.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.discountedRows).toHaveLength(2);
    });
  });
});
