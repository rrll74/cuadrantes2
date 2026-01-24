/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { SessionStatsHelper } from './session-stats.helper';
import { ImportSession } from '../../entities/import-session.entity';
import { RawWorker } from '../../entities/raw-worker.entity';
import { UnmatchedResult } from '../../entities/unmatched-result.entity';
import { EstadoPresencia } from '../../entities/presence-result.entity';

describe('SessionStatsHelper', () => {
  let helper: SessionStatsHelper;

  const mockSessionRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockWorkerRepo = {
    find: jest.fn(),
  };

  const mockUnmatchedRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockDataSource = {
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    loadRelationCountAndMap: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionStatsHelper,
        {
          provide: getRepositoryToken(ImportSession, 'new'),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(RawWorker, 'new'),
          useValue: mockWorkerRepo,
        },
        {
          provide: getRepositoryToken(UnmatchedResult, 'new'),
          useValue: mockUnmatchedRepo,
        },
        {
          provide: getDataSourceToken('new'),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    helper = module.get<SessionStatsHelper>(SessionStatsHelper);

    jest.clearAllMocks();
    mockSessionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockUnmatchedRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockDataSource.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('getUnmatchedStats', () => {
    const sessionId = 1;

    it('debería retornar estadísticas agrupadas por estado y puesto', async () => {
      const statusStats = [
        { estado: EstadoPresencia.COMPLETO, count: '5' },
        { estado: EstadoPresencia.INCOMPLETO, count: '3' },
        { estado: EstadoPresencia.SIN_PRESENCIA, count: '2' },
      ];

      const puestoStats = [
        { puesto: 'Conductor', count: '6' },
        { puesto: 'Ayudante', count: '4' },
      ];

      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce(statusStats)
        .mockResolvedValueOnce(puestoStats);

      const result = await helper.getUnmatchedStats(sessionId);

      expect(result.byStatus).toEqual({
        [EstadoPresencia.COMPLETO]: 5,
        [EstadoPresencia.INCOMPLETO]: 3,
        [EstadoPresencia.SIN_PRESENCIA]: 2,
      });

      expect(result.byPuesto).toEqual({
        Conductor: 6,
        Ayudante: 4,
      });
    });

    it('debería convertir strings a números en estadísticas', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { estado: EstadoPresencia.COMPLETO, count: '10' },
        ])
        .mockResolvedValueOnce([{ puesto: 'Conductor', count: '10' }]);

      const result = await helper.getUnmatchedStats(sessionId);

      expect(result.byStatus[EstadoPresencia.COMPLETO]).toBe(10);
      expect(typeof result.byStatus[EstadoPresencia.COMPLETO]).toBe('number');
      expect(result.byPuesto['Conductor']).toBe(10);
    });

    it('debería agrupar puestos con valores null bajo "Sin puesto"', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { estado: EstadoPresencia.COMPLETO, count: '5' },
        ])
        .mockResolvedValueOnce([
          { puesto: 'Conductor', count: '3' },
          { puesto: null, count: '2' },
        ]);

      const result = await helper.getUnmatchedStats(sessionId);

      expect(result.byPuesto['Sin puesto']).toBe(2);
    });

    it('debería agrupar puestos vacíos bajo "Sin puesto"', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { estado: EstadoPresencia.COMPLETO, count: '5' },
        ])
        .mockResolvedValueOnce([
          { puesto: 'Conductor', count: '3' },
          { puesto: '   ', count: '2' },
        ]);

      const result = await helper.getUnmatchedStats(sessionId);

      expect(result.byPuesto['Sin puesto']).toBe(2);
    });

    it('debería acumular puestos duplicados', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { estado: EstadoPresencia.COMPLETO, count: '5' },
        ])
        .mockResolvedValueOnce([
          { puesto: 'Conductor', count: '3' },
          { puesto: 'Conductor', count: '2' },
        ]);

      const result = await helper.getUnmatchedStats(sessionId);

      expect(result.byPuesto['Conductor']).toBe(5);
    });

    it('debería retornar estadísticas vacías cuando no hay resultados', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await helper.getUnmatchedStats(sessionId);

      expect(result.byStatus).toEqual({});
      expect(result.byPuesto).toEqual({});
    });

    it('debería aplicar where con sessionId a ambas queries', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await helper.getUnmatchedStats(sessionId);

      // Primera query para estados
      expect(mockUnmatchedRepo.createQueryBuilder).toHaveBeenCalledWith('u');

      // Verificar que se aplicó el filtro sessionId (al menos una vez por query)
      const callCount = mockQueryBuilder.where.mock.calls.length;
      expect(callCount).toBeGreaterThanOrEqual(2);
    });

    it('debería ordenar puestos por cantidad descendente', async () => {
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { estado: EstadoPresencia.COMPLETO, count: '10' },
        ])
        .mockResolvedValueOnce([
          { puesto: 'Conductor', count: '5' },
          { puesto: 'Ayudante', count: '8' },
          { puesto: 'Jefe', count: '2' },
        ]);

      await helper.getUnmatchedStats(sessionId);

      // Verificar que se aplicó orderBy DESC para count
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('count', 'DESC');
    });
  });

  describe('findAllSessions', () => {
    it('debería retornar todas las sesiones con contadores de relaciones', async () => {
      const mockSessions = [
        {
          id: 1,
          createdAt: new Date('2023-01-10'),
          totalRutas: 10,
          totalResultados: 50,
        },
        {
          id: 2,
          createdAt: new Date('2023-01-05'),
          totalRutas: 5,
          totalResultados: 25,
        },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockSessions);

      const result = await helper.findAllSessions();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect((result[0] as any).totalRutas).toBe(10);
      expect((result[0] as any).totalResultados).toBe(50);
    });

    it('debería crear query builder con alias "session"', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await helper.findAllSessions();

      expect(mockSessionRepo.createQueryBuilder).toHaveBeenCalledWith(
        'session',
      );
    });

    it('debería cargar relación totalRutas desde session.routes', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await helper.findAllSessions();

      expect(mockQueryBuilder.loadRelationCountAndMap).toHaveBeenCalledWith(
        'session.totalRutas',
        'session.routes',
      );
    });

    it('debería cargar relación totalResultados desde session.results', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await helper.findAllSessions();

      expect(mockQueryBuilder.loadRelationCountAndMap).toHaveBeenCalledWith(
        'session.totalResultados',
        'session.results',
      );
    });

    it('debería ordenar sesiones por fecha de creación descendente', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await helper.findAllSessions();

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'session.createdAt',
        'DESC',
      );
    });

    it('debería retornar sesiones ordenadas más recientes primero', async () => {
      const mockSessions = [
        { id: 2, createdAt: new Date('2023-01-20') },
        { id: 1, createdAt: new Date('2023-01-10') },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockSessions);

      const result = await helper.findAllSessions();

      expect(result[0].createdAt.getTime()).toBeGreaterThan(
        result[1].createdAt.getTime(),
      );
    });

    it('debería retornar array vacío cuando no hay sesiones', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await helper.findAllSessions();

      expect(result).toEqual([]);
    });

    it('debería incluir todos los campos de la sesión', async () => {
      const mockSession = {
        id: 1,
        name: 'Import 2023-01-10',
        createdAt: new Date('2023-01-10'),
        totalRutas: 10,
        totalResultados: 50,
        discountServices: 'S1,S2',
        discountTeams: 'E1',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockSession]);

      const result = await helper.findAllSessions();

      expect(result[0].discountServices).toBe('S1,S2');
      expect(result[0].discountTeams).toBe('E1');
    });
  });
});
