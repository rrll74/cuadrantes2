import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In, Like, Brackets } from 'typeorm';
import { SessionQueryHelper } from './session-query.helper';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';
import { RawWorker } from '../../entities/raw-worker.entity';
import { ImportSession } from '../../entities/import-session.entity';
import { UnmatchedResult } from '../../entities/unmatched-result.entity';

describe('SessionQueryHelper', () => {
  let helper: SessionQueryHelper;
  let workerRepo: Repository<RawWorker>;
  let resultRepo: Repository<PresenceResult>;
  let sessionRepo: Repository<ImportSession>;
  let unmatchedRepo: Repository<UnmatchedResult>;

  const mockWorkerRepo = {
    find: jest.fn(),
  };

  const mockResultRepo = {
    findAndCount: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockSessionRepo = {
    findOne: jest.fn(),
  };

  const mockUnmatchedRepo = {
    findAndCount: jest.fn(),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getRawMany: jest.fn(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionQueryHelper,
        {
          provide: getRepositoryToken(RawWorker, 'new'),
          useValue: mockWorkerRepo,
        },
        {
          provide: getRepositoryToken(PresenceResult, 'new'),
          useValue: mockResultRepo,
        },
        {
          provide: getRepositoryToken(ImportSession, 'new'),
          useValue: mockSessionRepo,
        },
        {
          provide: getRepositoryToken(UnmatchedResult, 'new'),
          useValue: mockUnmatchedRepo,
        },
      ],
    }).compile();

    helper = module.get<SessionQueryHelper>(SessionQueryHelper);
    workerRepo = module.get(getRepositoryToken(RawWorker, 'new'));
    resultRepo = module.get(getRepositoryToken(PresenceResult, 'new'));
    sessionRepo = module.get(getRepositoryToken(ImportSession, 'new'));
    unmatchedRepo = module.get(getRepositoryToken(UnmatchedResult, 'new'));

    jest.clearAllMocks();
    mockResultRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  describe('getSessionResults', () => {
    const sessionId = 1;
    const baseDate = new Date('2023-01-01T00:00:00Z');

    it('debería devolver resultados paginados con valores por defecto', async () => {
      const mockResults = [
        {
          id: 1,
          route: {
            workerId: 100,
            fechaGeneral: baseDate,
            inicio: baseDate,
            servicio: 'S1',
            equipo: 'E1',
          },
          estado: EstadoPresencia.COMPLETO,
          esDuplicado: false,
          revisar: false,
          fichajeEntrada: baseDate,
          fichajeSalida: new Date('2023-01-01T08:00:00Z'),
        },
      ];

      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });
      mockResultRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockResults, 1]);
      mockWorkerRepo.find.mockResolvedValue([
        {
          excelId: 100,
          nombre: 'Juan',
          apellido1: 'Perez',
          apellido2: 'Lopez',
        },
      ]);
      mockResultRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { estado: EstadoPresencia.COMPLETO, count: '1' },
      ]);
      mockResultRepo.count.mockResolvedValue(0);

      const result = await helper.getSessionResults(sessionId, 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].trabajador?.nombre).toBe('Juan');
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
      expect(result.stats.total).toBe(1);
      expect(result.stats.completo).toBe(1);
    });

    it('debería aplicar paginación correctamente', async () => {
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 50]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      await helper.getSessionResults(sessionId, 3, 20);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(40); // (3-1)*20
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('debería filtrar por estado cuando se proporciona', async () => {
      const status = EstadoPresencia.INCOMPLETO;

      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      await helper.getSessionResults(sessionId, 1, 10, undefined, status);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'result.estado = :status',
        { status },
      );
    });

    it('debería buscar trabajadores por nombre y aplcar filtros OR', async () => {
      const search = 'Juan';

      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });
      mockWorkerRepo.find.mockResolvedValue([{ excelId: 100 }]);
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      await helper.getSessionResults(sessionId, 1, 10, search);

      expect(mockWorkerRepo.find).toHaveBeenCalledWith({
        where: [
          { sessionId, nombre: Like(`%${search}%`) },
          { sessionId, apellido1: Like(`%${search}%`) },
          { sessionId, apellido2: Like(`%${search}%`) },
        ],
        select: ['excelId'],
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('debería filtrar servicios descontados correctamente', async () => {
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 'S1, S2',
        discountTeams: '',
      });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      await helper.getSessionResults(
        sessionId,
        1,
        10,
        undefined,
        undefined,
        'true',
      );

      // Se debe filtrar por servicios descontados
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('debería excluir servicios descontados cuando discounted=false', async () => {
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 'S1',
        discountTeams: '',
      });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      await helper.getSessionResults(
        sessionId,
        1,
        10,
        undefined,
        undefined,
        'false',
      );

      // Debe aplicar NOT a la condición de servicios descontados
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('debería calcular las estadísticas por estado correctamente', async () => {
      const mockResults = [
        {
          id: 1,
          route: { workerId: 100, servicio: 'S1', equipo: 'E1' },
          estado: EstadoPresencia.COMPLETO,
          revisar: false,
        },
        {
          id: 2,
          route: { workerId: 100, servicio: 'S1', equipo: 'E1' },
          estado: EstadoPresencia.INCOMPLETO,
          revisar: true,
        },
        {
          id: 3,
          route: { workerId: 100, servicio: 'S1', equipo: 'E1' },
          estado: EstadoPresencia.SIN_PRESENCIA,
          revisar: false,
        },
      ];

      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockResults, 3]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { estado: EstadoPresencia.COMPLETO, count: '1' },
        { estado: EstadoPresencia.INCOMPLETO, count: '1' },
        { estado: EstadoPresencia.SIN_PRESENCIA, count: '1' },
      ]);
      mockResultRepo.count.mockResolvedValue(1); // revisar count

      const result = await helper.getSessionResults(sessionId);

      expect(result.stats.total).toBe(3);
      expect(result.stats.completo).toBe(1);
      expect(result.stats.incompleto).toBe(1);
      expect(result.stats.sinPresencia).toBe(1);
      expect(result.stats.revisar).toBe(1);
    });

    it('debería mapear trabajadores a resultados correctamente', async () => {
      const mockResults = [
        {
          id: 1,
          route: {
            workerId: 100,
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
          },
          estado: EstadoPresencia.COMPLETO,
          revisar: false,
          esDuplicado: false,
          fichajeEntrada: baseDate,
          fichajeSalida: new Date('2023-01-01T08:00:00Z'),
        },
      ];

      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockResults, 1]);
      mockWorkerRepo.find.mockResolvedValue([
        {
          excelId: 100,
          nombre: 'Juan',
          apellido1: 'Perez',
          apellido2: 'Lopez',
          puesto: 'Conductor',
        },
      ]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      const result = await helper.getSessionResults(sessionId);

      expect(result.data[0].trabajador?.nombre).toBe('Juan');
      expect(result.data[0].trabajador?.puesto).toBe('Conductor');
    });

    it('debería marcar resultados como descontados si aplica descuento de servicio', async () => {
      const mockResults = [
        {
          id: 1,
          route: {
            workerId: 100,
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
          },
          estado: EstadoPresencia.COMPLETO,
          revisar: false,
          esDuplicado: false,
          fichajeEntrada: baseDate,
          fichajeSalida: new Date('2023-01-01T08:00:00Z'),
        },
      ];

      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 's1',
        discountTeams: '',
      });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockResults, 1]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      const result = await helper.getSessionResults(sessionId);

      expect(result.data[0].isDiscounted).toBe(true);
    });

    it('debería retornar totalPages = 1 cuando limit es 0', async () => {
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 100]);
      mockWorkerRepo.find.mockResolvedValue([]);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockResultRepo.count.mockResolvedValue(0);

      const result = await helper.getSessionResults(sessionId, 1, 0);

      expect(result.meta.totalPages).toBe(1);
    });
  });

  describe('getUnmatchedResults', () => {
    const sessionId = 1;

    it('debería devolver resultados sin ruta paginados', async () => {
      const mockResults = [
        {
          id: 1,
          sessionId,
          workerId: 100,
          fecha: new Date('2023-01-01'),
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockUnmatchedRepo.findAndCount.mockResolvedValue([mockResults, 1]);
      mockWorkerRepo.find.mockResolvedValue([
        {
          excelId: 100,
          nombre: 'Juan',
          apellido1: 'Perez',
          apellido2: 'Lopez',
        },
      ]);

      const result = await helper.getUnmatchedResults(sessionId, 1, 10);

      expect(mockUnmatchedRepo.findAndCount).toHaveBeenCalledWith({
        where: { sessionId },
        order: { fecha: 'ASC' },
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('debería aplicar paginación correctamente para unmatched', async () => {
      mockUnmatchedRepo.findAndCount.mockResolvedValue([[], 50]);
      mockWorkerRepo.find.mockResolvedValue([]);

      await helper.getUnmatchedResults(sessionId, 2, 25);

      expect(mockUnmatchedRepo.findAndCount).toHaveBeenCalledWith({
        where: { sessionId },
        order: { fecha: 'ASC' },
        skip: 25, // (2-1)*25
        take: 25,
      });
    });

    it('debería filtrar por estado para resultados sin ruta', async () => {
      const status = EstadoPresencia.INCOMPLETO;

      mockUnmatchedRepo.findAndCount.mockResolvedValue([[], 0]);
      mockWorkerRepo.find.mockResolvedValue([]);

      await helper.getUnmatchedResults(sessionId, 1, 10, undefined, status);

      expect(mockUnmatchedRepo.findAndCount).toHaveBeenCalledWith({
        where: { sessionId, estado: status },
        order: { fecha: 'ASC' },
        skip: 0,
        take: 10,
      });
    });

    it('debería buscar trabajadores por nombre para unmatched', async () => {
      const search = 'Perez';

      mockWorkerRepo.find.mockResolvedValue([{ excelId: 200 }]);
      mockUnmatchedRepo.findAndCount.mockResolvedValue([[], 0]);

      await helper.getUnmatchedResults(sessionId, 1, 10, search);

      expect(mockWorkerRepo.find).toHaveBeenCalledWith({
        where: [
          { sessionId, nombre: Like(`%${search}%`) },
          { sessionId, apellido1: Like(`%${search}%`) },
          { sessionId, apellido2: Like(`%${search}%`) },
          { sessionId, puesto: Like(`%${search}%`) },
        ],
        select: ['excelId'],
      });
    });

    it('debería retornar vacío cuando la búsqueda no encuentra trabajadores', async () => {
      const search = 'NoExiste';

      mockWorkerRepo.find.mockResolvedValue([]);

      const result = await helper.getUnmatchedResults(sessionId, 1, 10, search);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('debería mapear trabajadores a resultados sin ruta', async () => {
      const mockResults = [
        { id: 1, sessionId, workerId: 100, fecha: new Date() },
      ];

      mockUnmatchedRepo.findAndCount.mockResolvedValue([mockResults, 1]);
      mockWorkerRepo.find.mockResolvedValue([
        { excelId: 100, nombre: 'Juan', puesto: 'Conductor' },
      ]);

      const result = await helper.getUnmatchedResults(sessionId);

      expect(result.data[0].trabajador?.nombre).toBe('Juan');
    });

    it('debería retornar null para trabajador cuando no se encuentra', async () => {
      const mockResults = [
        { id: 1, sessionId, workerId: 100, fecha: new Date() },
      ];

      mockUnmatchedRepo.findAndCount.mockResolvedValue([mockResults, 1]);
      mockWorkerRepo.find.mockResolvedValue([]);

      const result = await helper.getUnmatchedResults(sessionId);

      expect(result.data[0].trabajador).toBeNull();
    });

    it('debería no paginar cuando limit es 0', async () => {
      mockUnmatchedRepo.findAndCount.mockResolvedValue([[], 0]);
      mockWorkerRepo.find.mockResolvedValue([]);

      await helper.getUnmatchedResults(sessionId, 1, 0);

      expect(mockUnmatchedRepo.findAndCount).toHaveBeenCalledWith({
        where: { sessionId },
        order: { fecha: 'ASC' },
      });
    });

    it('debería combinar búsqueda y filtro de estado', async () => {
      const search = 'Juan';
      const status = EstadoPresencia.COMPLETO;

      mockWorkerRepo.find.mockResolvedValue([{ excelId: 100 }]);
      mockUnmatchedRepo.findAndCount.mockResolvedValue([[], 0]);

      await helper.getUnmatchedResults(sessionId, 1, 10, search, status);

      expect(mockUnmatchedRepo.findAndCount).toHaveBeenCalledWith({
        where: { sessionId, estado: status, workerId: In([100]) },
        order: { fecha: 'ASC' },
        skip: 0,
        take: 10,
      });
    });
  });
});
