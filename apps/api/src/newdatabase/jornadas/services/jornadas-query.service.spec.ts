/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { JornadasQueryService } from './jornadas-query.service';
import { SessionQueryHelper } from './query-helpers/session-query.helper';
import { SessionStatsHelper } from './query-helpers/session-stats.helper';
import { JornadasTableHelper } from './query-helpers/jornadas-table.helper';
import { JornadasServiceSummaryHelper } from './query-helpers/jornadas-service-summary.helper';
import { JornadasWorkerSummaryHelper } from './query-helpers/jornadas-worker-summary.helper';
import { JornadasStatusSummaryHelper } from './query-helpers/jornadas-status-summary.helper';
import { EstadoPresencia } from '../entities/presence-result.entity';

describe('JornadasQueryService', () => {
  let service: JornadasQueryService;
  let sessionQueryHelper: SessionQueryHelper;
  let sessionStatsHelper: SessionStatsHelper;
  let jornadasTableHelper: JornadasTableHelper;
  let jornadasServiceSummaryHelper: JornadasServiceSummaryHelper;
  let jornadasWorkerSummaryHelper: JornadasWorkerSummaryHelper;
  let jornadasStatusSummaryHelper: JornadasStatusSummaryHelper;

  const mockSessionQueryHelper = {
    getSessionResults: jest.fn(),
    getUnmatchedResults: jest.fn(),
  };

  const mockSessionStatsHelper = {
    getUnmatchedStats: jest.fn(),
    findAllSessions: jest.fn(),
  };

  const mockJornadasTableHelper = {
    getJornadasTableDetail: jest.fn(),
  };

  const mockJornadasServiceSummaryHelper = {
    getJornadasByServiceSummary: jest.fn(),
  };

  const mockJornadasWorkerSummaryHelper = {
    getJornadasByEqualAndPuestoSummary: jest.fn(),
  };

  const mockJornadasStatusSummaryHelper = {
    getJornadasByStatusAndPartsSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadasQueryService,
        {
          provide: SessionQueryHelper,
          useValue: mockSessionQueryHelper,
        },
        {
          provide: SessionStatsHelper,
          useValue: mockSessionStatsHelper,
        },
        {
          provide: JornadasTableHelper,
          useValue: mockJornadasTableHelper,
        },
        {
          provide: JornadasServiceSummaryHelper,
          useValue: mockJornadasServiceSummaryHelper,
        },
        {
          provide: JornadasWorkerSummaryHelper,
          useValue: mockJornadasWorkerSummaryHelper,
        },
        {
          provide: JornadasStatusSummaryHelper,
          useValue: mockJornadasStatusSummaryHelper,
        },
      ],
    }).compile();

    service = module.get<JornadasQueryService>(JornadasQueryService);
    sessionQueryHelper = module.get<SessionQueryHelper>(SessionQueryHelper);
    sessionStatsHelper = module.get<SessionStatsHelper>(SessionStatsHelper);
    jornadasTableHelper = module.get<JornadasTableHelper>(JornadasTableHelper);
    jornadasServiceSummaryHelper = module.get<JornadasServiceSummaryHelper>(
      JornadasServiceSummaryHelper,
    );
    jornadasWorkerSummaryHelper = module.get<JornadasWorkerSummaryHelper>(
      JornadasWorkerSummaryHelper,
    );
    jornadasStatusSummaryHelper = module.get<JornadasStatusSummaryHelper>(
      JornadasStatusSummaryHelper,
    );

    jest.clearAllMocks();
  });

  describe('getSessionResults', () => {
    const sessionId = 1;

    it('debería delegar a sessionQueryHelper', async () => {
      const mockData = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
        stats: {},
      };
      mockSessionQueryHelper.getSessionResults.mockResolvedValue(mockData);

      const result = await service.getSessionResults(sessionId, 1, 10);

      expect(mockSessionQueryHelper.getSessionResults).toHaveBeenCalledWith(
        sessionId,
        1,
        10,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockData);
    });

    it('debería pasar parámetros de paginación', async () => {
      mockSessionQueryHelper.getSessionResults.mockResolvedValue({});

      await service.getSessionResults(sessionId, 2, 20);

      expect(mockSessionQueryHelper.getSessionResults).toHaveBeenCalledWith(
        sessionId,
        2,
        20,
        undefined,
        undefined,
        undefined,
      );
    });

    it('debería pasar parámetros de búsqueda y filtro', async () => {
      mockSessionQueryHelper.getSessionResults.mockResolvedValue({});

      await service.getSessionResults(
        sessionId,
        1,
        10,
        'Juan',
        EstadoPresencia.COMPLETO,
        'true',
      );

      expect(mockSessionQueryHelper.getSessionResults).toHaveBeenCalledWith(
        sessionId,
        1,
        10,
        'Juan',
        EstadoPresencia.COMPLETO,
        'true',
      );
    });

    it('debería retornar resultado del helper sin modificación', async () => {
      const mockData = {
        data: [
          { ruta: {}, trabajador: null, estado: EstadoPresencia.COMPLETO },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        stats: {
          total: 1,
          completo: 1,
          incompleto: 0,
          sinPresencia: 0,
          revisar: 0,
        },
      };
      mockSessionQueryHelper.getSessionResults.mockResolvedValue(mockData);

      const result = await service.getSessionResults(sessionId);

      expect(result.data).toHaveLength(1);
      expect(result.stats.completo).toBe(1);
    });
  });

  describe('getUnmatchedResults', () => {
    const sessionId = 1;

    it('debería delegar a sessionQueryHelper', async () => {
      const mockData = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      mockSessionQueryHelper.getUnmatchedResults.mockResolvedValue(mockData);

      const result = await service.getUnmatchedResults(sessionId);

      expect(mockSessionQueryHelper.getUnmatchedResults).toHaveBeenCalledWith(
        sessionId,
        1,
        10,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockData);
    });

    it('debería pasar parámetros correctamente', async () => {
      mockSessionQueryHelper.getUnmatchedResults.mockResolvedValue({});

      await service.getUnmatchedResults(
        sessionId,
        3,
        25,
        'Perez',
        EstadoPresencia.INCOMPLETO,
      );

      expect(mockSessionQueryHelper.getUnmatchedResults).toHaveBeenCalledWith(
        sessionId,
        3,
        25,
        'Perez',
        EstadoPresencia.INCOMPLETO,
      );
    });
  });

  describe('getUnmatchedStats', () => {
    const sessionId = 1;

    it('debería delegar a sessionStatsHelper', async () => {
      const mockData = { byStatus: {}, byPuesto: {} };
      mockSessionStatsHelper.getUnmatchedStats.mockResolvedValue(mockData);

      const result = await service.getUnmatchedStats(sessionId);

      expect(mockSessionStatsHelper.getUnmatchedStats).toHaveBeenCalledWith(
        sessionId,
      );
      expect(result).toEqual(mockData);
    });

    it('debería retornar estadísticas sin modificación', async () => {
      const mockData = {
        byStatus: {
          [EstadoPresencia.COMPLETO]: 5,
          [EstadoPresencia.INCOMPLETO]: 3,
        },
        byPuesto: { Conductor: 6, Ayudante: 2 },
      };
      mockSessionStatsHelper.getUnmatchedStats.mockResolvedValue(mockData);

      const result = await service.getUnmatchedStats(sessionId);

      expect(result.byStatus[EstadoPresencia.COMPLETO]).toBe(5);
      expect(result.byPuesto['Conductor']).toBe(6);
    });
  });

  describe('findAllSessions', () => {
    it('debería delegar a sessionStatsHelper', async () => {
      const mockSessions = [{ id: 1, createdAt: new Date(), totalRutas: 10 }];
      mockSessionStatsHelper.findAllSessions.mockResolvedValue(mockSessions);

      const result = await service.findAllSessions();

      expect(mockSessionStatsHelper.findAllSessions).toHaveBeenCalled();
      expect(result).toEqual(mockSessions);
    });

    it('debería retornar lista ordenada de sesiones', async () => {
      const mockSessions = [
        { id: 2, createdAt: new Date('2023-01-20'), totalRutas: 5 },
        { id: 1, createdAt: new Date('2023-01-10'), totalRutas: 10 },
      ];
      mockSessionStatsHelper.findAllSessions.mockResolvedValue(mockSessions);

      const result = await service.findAllSessions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2);
    });
  });

  describe('getJornadasTableDetail', () => {
    const sessionId = 1;

    it('debería delegar a jornadasTableHelper', async () => {
      const mockTable = {
        columns: [],
        rows: [],
        footer: {},
        discountedRows: [],
        discountedFooter: {},
      };
      mockJornadasTableHelper.getJornadasTableDetail.mockResolvedValue(
        mockTable,
      );

      const result = await service.getJornadasTableDetail(sessionId);

      expect(
        mockJornadasTableHelper.getJornadasTableDetail,
      ).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(mockTable);
    });

    it('debería retornar tabla detallada sin modificación', async () => {
      const mockTable = {
        columns: [{ key: '2023-01-01', label: '01 L' }],
        rows: [{ servicio: 'S1', equipo: 'E1', '2023-01-01_value': 1 }],
        footer: { servicio: 'TOTAL', '2023-01-01_value': 1 },
        discountedRows: [],
        discountedFooter: {},
      };
      mockJornadasTableHelper.getJornadasTableDetail.mockResolvedValue(
        mockTable,
      );

      const result = await service.getJornadasTableDetail(sessionId);

      expect(result.columns).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
    });
  });

  describe('getJornadasByServiceSummary', () => {
    const sessionId = 1;

    it('debería delegar a jornadasServiceSummaryHelper', async () => {
      const mockSummary = {
        rows: [{ servicio: 'S1', jornadas: 5 }],
        discountedRows: [],
        total: 5,
        discountedTotal: 0,
        session: { id: sessionId },
      };
      mockJornadasServiceSummaryHelper.getJornadasByServiceSummary.mockResolvedValue(
        mockSummary,
      );

      const result = await service.getJornadasByServiceSummary(sessionId);

      expect(
        mockJornadasServiceSummaryHelper.getJornadasByServiceSummary,
      ).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(mockSummary);
    });

    it('debería retornar sumario agrupado por servicio', async () => {
      const mockSummary = {
        rows: [
          { servicio: 'S1', jornadas: 5 },
          { servicio: 'S2', jornadas: 3 },
        ],
        discountedRows: [],
        total: 8,
        discountedTotal: 0,
        session: {},
      };
      mockJornadasServiceSummaryHelper.getJornadasByServiceSummary.mockResolvedValue(
        mockSummary,
      );

      const result = await service.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(8);
    });
  });

  describe('getJornadasByEqualAndPuestoSummary', () => {
    const sessionId = 1;

    it('debería delegar a jornadasWorkerSummaryHelper', async () => {
      const mockSummary = {
        rows: [{ puesto: 'Conductor', equal: 100, jornadas: 5 }],
        discountedRows: [],
        total: 5,
        discountedTotal: 0,
        session: { id: sessionId },
      };
      mockJornadasWorkerSummaryHelper.getJornadasByEqualAndPuestoSummary.mockResolvedValue(
        mockSummary,
      );

      const result =
        await service.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(
        mockJornadasWorkerSummaryHelper.getJornadasByEqualAndPuestoSummary,
      ).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(mockSummary);
    });

    it('debería retornar sumario agrupado por puesto y equal', async () => {
      const mockSummary = {
        rows: [
          { puesto: 'Conductor', equal: 100, jornadas: 5 },
          { puesto: 'Ayudante', equal: 50, jornadas: 3 },
        ],
        discountedRows: [],
        total: 8,
        discountedTotal: 0,
        session: {},
      };
      mockJornadasWorkerSummaryHelper.getJornadasByEqualAndPuestoSummary.mockResolvedValue(
        mockSummary,
      );

      const result =
        await service.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].puesto).toBe('Conductor');
    });
  });

  describe('getJornadasByStatusAndPartsSummary', () => {
    const sessionId = 1;

    it('debería delegar a jornadasStatusSummaryHelper', async () => {
      const mockSummary = {
        rows: [
          {
            estado: EstadoPresencia.COMPLETO,
            withPartsCount: 50,
            withPartsPercent: 80,
            noPartsCount: 10,
            noPartsPercent: 20,
          },
        ],
        footer: {
          estado: 'TOTAL',
          withPartsCount: 50,
          withPartsPercent: 100,
          noPartsCount: 10,
          noPartsPercent: 100,
        },
      };
      mockJornadasStatusSummaryHelper.getJornadasByStatusAndPartsSummary.mockResolvedValue(
        mockSummary,
      );

      const result =
        await service.getJornadasByStatusAndPartsSummary(sessionId);

      expect(
        mockJornadasStatusSummaryHelper.getJornadasByStatusAndPartsSummary,
      ).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(mockSummary);
    });

    it('debería retornar resumen de estados separados por partes', async () => {
      const mockSummary = {
        rows: [
          {
            estado: EstadoPresencia.COMPLETO,
            withPartsCount: 50,
            withPartsPercent: 70,
            noPartsCount: 20,
            noPartsPercent: 30,
          },
          {
            estado: EstadoPresencia.INCOMPLETO,
            withPartsCount: 10,
            withPartsPercent: 14,
            noPartsCount: 30,
            noPartsPercent: 70,
          },
        ],
        footer: {
          estado: 'TOTAL',
          withPartsCount: 60,
          withPartsPercent: 100,
          noPartsCount: 50,
          noPartsPercent: 100,
        },
      };
      mockJornadasStatusSummaryHelper.getJornadasByStatusAndPartsSummary.mockResolvedValue(
        mockSummary,
      );

      const result =
        await service.getJornadasByStatusAndPartsSummary(sessionId);

      expect(result.rows).toHaveLength(2);
      expect(result.footer.estado).toBe('TOTAL');
      expect(result.footer.withPartsCount).toBe(60);
    });
  });
});
