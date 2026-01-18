/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JornadasQueryService } from './jornadas-query.service';
import { ImportSession } from '../entities/import-session.entity';
import { RawWorker } from '../entities/raw-worker.entity';
import {
  PresenceResult,
  EstadoPresencia,
} from '../entities/presence-result.entity';
import { UnmatchedResult } from '../entities/unmatched-result.entity';

describe('JornadasQueryService', () => {
  let service: JornadasQueryService;
  let workerRepo: Repository<RawWorker>;
  let resultRepo: Repository<PresenceResult>;
  let unmatchedRepo: Repository<UnmatchedResult>;
  let sessionRepo: Repository<ImportSession>;
  let dataSource: DataSource;

  // Mocks específicos para cada repositorio para evitar colisiones en los spies
  const mockWorkerRepo = {
    find: jest.fn(),
  };

  const mockResultRepo = {
    findAndCount: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUnmatchedRepo = {
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSessionRepo = {
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

  const mockDataSource = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadasQueryService,
        {
          provide: getRepositoryToken(ImportSession, 'new'),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(RawWorker, 'new'),
          useValue: mockWorkerRepo,
        },
        {
          provide: getRepositoryToken(PresenceResult, 'new'),
          useValue: mockResultRepo,
        },
        {
          provide: getRepositoryToken(UnmatchedResult, 'new'),
          useValue: mockUnmatchedRepo,
        },
        { provide: getDataSourceToken('new'), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<JornadasQueryService>(JornadasQueryService);
    workerRepo = module.get(getRepositoryToken(RawWorker, 'new'));
    resultRepo = module.get(getRepositoryToken(PresenceResult, 'new'));
    unmatchedRepo = module.get(getRepositoryToken(UnmatchedResult, 'new'));
    sessionRepo = module.get(getRepositoryToken(ImportSession, 'new'));
    dataSource = module.get(getDataSourceToken('new'));

    jest.clearAllMocks();
    // Configurar comportamiento por defecto del QueryBuilder
    mockResultRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockUnmatchedRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockSessionRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('getSessionResults', () => {
    const sessionId = 1;

    it('debería devolver resultados paginados con parámetros por defecto', async () => {
      const mockResults = [
        {
          id: 1,
          route: {
            workerId: 100,
            fechaGeneral: new Date(),
            inicio: new Date(),
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];
      mockResultRepo.findAndCount.mockResolvedValue([mockResults, 1]);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, nombre: 'Test Worker' },
      ]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]); // Stats vacíos
      mockResultRepo.count.mockResolvedValue(0); // Revisar count

      const result = await service.getSessionResults(sessionId);

      expect(mockResultRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId },
          skip: 0,
          take: 10,
          relations: ['route'],
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].trabajador?.nombre).toBe('Test Worker');
      expect(result.meta.total).toBe(1);
    });

    it('debería filtrar por término de búsqueda (nombre trabajador o equipo)', async () => {
      const search = 'Juan';
      // 1. Búsqueda de trabajadores
      mockWorkerRepo.find.mockResolvedValueOnce([{ excelId: 100 }]);
      // 2. Búsqueda de resultados (mock vacío para simplificar)
      mockResultRepo.findAndCount.mockResolvedValue([[], 0]);
      // 3. Stats
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      await service.getSessionResults(sessionId, 1, 10, search);

      // Verificar que se buscó en el repositorio de trabajadores
      expect(mockWorkerRepo.find).toHaveBeenCalled();

      // Verificar que la consulta principal incluye las condiciones OR (array)
      expect(mockResultRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            // Condición por ID de trabajador encontrado
            expect.objectContaining({
              sessionId,
              route: expect.objectContaining({ workerId: expect.anything() }),
            }),
            // Condición por nombre de equipo
            expect.objectContaining({
              sessionId,
              route: expect.objectContaining({ equipo: expect.anything() }),
            }),
          ]),
        }),
      );
    });

    it('debería filtrar por estado', async () => {
      const status = EstadoPresencia.INCOMPLETO;
      mockResultRepo.findAndCount.mockResolvedValue([[], 0]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      await service.getSessionResults(sessionId, 1, 10, undefined, status);

      expect(mockResultRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ sessionId, estado: status }),
        }),
      );
    });

    it('debería combinar búsqueda y filtro de estado correctamente', async () => {
      const search = 'Juan';
      const status = EstadoPresencia.COMPLETO;

      mockWorkerRepo.find.mockResolvedValueOnce([{ excelId: 100 }]);
      mockResultRepo.findAndCount.mockResolvedValue([[], 0]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      await service.getSessionResults(sessionId, 1, 10, search, status);

      // Al haber búsqueda, el where es un array. El estado debe aplicarse a cada elemento del array.
      expect(mockResultRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ estado: status }),
            expect.objectContaining({ estado: status }),
          ]),
        }),
      );
    });
  });

  describe('getUnmatchedResults', () => {
    const sessionId = 1;

    it('debería devolver resultados sin ruta paginados', async () => {
      mockUnmatchedRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getUnmatchedResults(sessionId, 2, 20);

      expect(mockUnmatchedRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionId },
          skip: 20, // (page 2 - 1) * 20
          take: 20,
        }),
      );
    });

    it('debería filtrar unmatched por búsqueda de trabajador', async () => {
      const search = 'Perez';
      mockWorkerRepo.find.mockResolvedValueOnce([{ excelId: 200 }]);
      mockUnmatchedRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getUnmatchedResults(sessionId, 1, 10, search);

      expect(mockUnmatchedRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sessionId,
            workerId: expect.anything(), // In([200])
          }),
        }),
      );
    });
  });

  describe('findAllSessions', () => {
    it('debería listar sesiones con contadores', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      await service.findAllSessions();
      expect(mockSessionRepo.createQueryBuilder).toHaveBeenCalledWith(
        'session',
      );
      expect(mockQueryBuilder.loadRelationCountAndMap).toHaveBeenCalledTimes(2);
    });
  });

  describe('getJornadasTableDetail', () => {
    it('debería generar la tabla detallada agrupando por servicio, equipo y fecha', async () => {
      const sessionId = 1;
      const date = new Date('2023-01-01T00:00:00Z');
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: date,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 7h = 1 jornada
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: date,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T11:30:00Z'), // 3.5h = 0.5 jornada
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];
      mockResultRepo.find.mockResolvedValue(mockResults);

      const result = await service.getJornadasTableDetail(sessionId);

      expect(mockResultRepo.find).toHaveBeenCalledWith({
        where: { sessionId },
        relations: ['route'],
      });

      // 7h + 3.5h = 10.5h. 10.5 / 7 = 1.5 jornadas
      const dateKey = '2023-01-01';
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.rows[0][dateKey]).toBe(1.5);
      expect(result.footer.total).toBe(1.5);
    });
  });

  describe('getJornadasByServiceSummary', () => {
    it('debería agrupar por servicio y filtrar rutas sin partes asociados', async () => {
      const sessionId = 1;
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 1 jornada
            partesAsociados: 1,
          },
        },
        {
          route: {
            servicio: 'S2',
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 0, // Debe ignorarse
          },
        },
      ];
      mockResultRepo.find.mockResolvedValue(mockResults);

      const result = await service.getJornadasByServiceSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.rows[0].jornadas).toBe(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getJornadasByEqualAndPuestoSummary', () => {
    it('debería agrupar por puesto y equal sumando jornadas', async () => {
      const sessionId = 1;
      const mockResults = [
        {
          route: {
            workerId: 100,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 1 jornada
            partesAsociados: 1,
          },
        },
      ];
      mockResultRepo.find.mockResolvedValue(mockResults);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, puesto: 'Conductor', equal: 100 },
      ]);

      const result =
        await service.getJornadasByEqualAndPuestoSummary(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].puesto).toBe('Conductor');
      expect(result.rows[0].equal).toBe(100);
      expect(result.rows[0].jornadas).toBe(1);
    });
  });

  describe('getJornadasByStatusAndPartsSummary', () => {
    it('debería contar estados separando por presencia de partes', async () => {
      const sessionId = 1;
      const mockResults = [
        { estado: EstadoPresencia.COMPLETO, route: { partesAsociados: 1 } },
        { estado: EstadoPresencia.INCOMPLETO, route: { partesAsociados: 0 } },
      ];
      mockResultRepo.find.mockResolvedValue(mockResults);

      const result =
        await service.getJornadasByStatusAndPartsSummary(sessionId);

      const rowCompleto = result.rows.find(
        (r) => r.estado === EstadoPresencia.COMPLETO,
      );
      expect(rowCompleto?.withPartsCount).toBe(1);
      expect(rowCompleto?.noPartsCount).toBe(0);

      const rowIncompleto = result.rows.find(
        (r) => r.estado === EstadoPresencia.INCOMPLETO,
      );
      expect(rowIncompleto?.withPartsCount).toBe(0);
      expect(rowIncompleto?.noPartsCount).toBe(1);
    });
  });
});
