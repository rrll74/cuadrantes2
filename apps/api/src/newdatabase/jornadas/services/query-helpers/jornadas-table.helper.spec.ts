import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JornadasTableHelper } from './jornadas-table.helper';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';
import { ImportSession } from '../../entities/import-session.entity';

describe('JornadasTableHelper', () => {
  let helper: JornadasTableHelper;
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
        JornadasTableHelper,
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

    helper = module.get<JornadasTableHelper>(JornadasTableHelper);
    presenceRepo = module.get(getRepositoryToken(PresenceResult, 'new'));
    sessionRepo = module.get(getRepositoryToken(ImportSession, 'new'));

    jest.clearAllMocks();
  });

  describe('getJornadasTableDetail', () => {
    const sessionId = 1;
    const baseDate = new Date('2023-01-01T00:00:00Z');

    it('debería generar tabla con un día único', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 7h = 1 jornada
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.columns).toHaveLength(1);
      expect(result.columns[0].key).toBe('2023-01-01');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.rows[0].equipo).toBe('E1');
      expect(result.rows[0]['2023-01-01_value']).toBe(1);
    });

    it('debería agrupar múltiples registros por fecha, servicio y equipo', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'), // 7h
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T15:00:00Z'),
            fin: new Date('2023-01-01T18:30:00Z'), // 3.5h
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      // 10.5h total / 7 = 1.5 jornadas
      expect(result.rows[0]['2023-01-01_value']).toBe(1.5);
      expect(result.rows[0].total_value).toBe(1.5);
    });

    it('debería calcular múltiples fechas correctamente', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: new Date('2023-01-01'),
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: new Date('2023-01-02'),
            inicio: new Date('2023-01-02T08:00:00Z'),
            fin: new Date('2023-01-02T22:00:00Z'), // 14h = 2 jornadas
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.columns).toHaveLength(2);
      expect(result.rows[0]['2023-01-01_value']).toBe(1);
      expect(result.rows[0]['2023-01-02_value']).toBe(2);
    });

    it('debería asignar color GREEN a celdas con todos COMPLETO', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.rows[0]['2023-01-01_color']).toBe('green');
    });

    it('debería asignar color YELLOW cuando hay INCOMPLETO pero sin SIN_PRESENCIA', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T15:00:00Z'),
            fin: new Date('2023-01-01T18:30:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.INCOMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.rows[0]['2023-01-01_color']).toBe('yellow');
    });

    it('debería asignar color RED cuando hay SIN_PRESENCIA', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.SIN_PRESENCIA,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.rows[0]['2023-01-01_color']).toBe('red');
    });

    it('debería incluir footer con totales de columnas', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.footer).toBeDefined();
      expect(result.footer.servicio).toBe('TOTAL');
      expect(result.footer['2023-01-01_value']).toBe(1);
      expect(result.footer.total_value).toBe(1);
    });

    it('debería separar filas descontadas en discountedRows', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'DISCOUNT',
            equipo: 'E2',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 'discount',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.discountedRows).toHaveLength(1);
      expect(result.rows[0].servicio).toBe('S1');
      expect(result.discountedRows[0].servicio).toBe('DISCOUNT');
    });

    it('debería filtrar por equipos descontados', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'S1',
            equipo: 'NOCONTAR',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: 'nocontar',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.rows).toHaveLength(1);
      expect(result.discountedRows).toHaveLength(1);
      expect(result.rows[0].equipo).toBe('E1');
      expect(result.discountedRows[0].equipo).toBe('NOCONTAR');
    });

    it('debería ordenar columnas por fecha', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: new Date('2023-01-03'),
            inicio: new Date('2023-01-03T08:00:00Z'),
            fin: new Date('2023-01-03T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: new Date('2023-01-01'),
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.columns[0].key).toBe('2023-01-01');
      expect(result.columns[1].key).toBe('2023-01-03');
    });

    it('debería ordenar servicios y equipos alfabéticamente', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'Z',
            equipo: 'Z',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'A',
            equipo: 'A',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.rows[0].servicio).toBe('A');
      expect(result.rows[1].servicio).toBe('Z');
    });

    it('debería generar etiquetas de columna con día del número y letra', async () => {
      mockPresenceRepo.find.mockResolvedValue([
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: new Date('2023-01-02'), // Lunes
            inicio: new Date('2023-01-02T08:00:00Z'),
            fin: new Date('2023-01-02T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.columns[0].label).toMatch(/\d+ [DLMXJVS]/);
    });

    it('debería incluir discountedFooter con información separada', async () => {
      const mockResults = [
        {
          route: {
            servicio: 'S1',
            equipo: 'E1',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: {
            servicio: 'DISCOUNT',
            equipo: 'E2',
            fechaGeneral: baseDate,
            inicio: new Date('2023-01-01T08:00:00Z'),
            fin: new Date('2023-01-01T15:00:00Z'),
            partesAsociados: 1,
          },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: 'discount',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.discountedFooter).toBeDefined();
      expect(result.discountedFooter.servicio).toBe('TOTAL DESCONTADO');
      expect(result.discountedFooter['2023-01-01_value']).toBe(1);
    });

    it('debería devolver tabla vacía cuando no hay resultados', async () => {
      mockPresenceRepo.find.mockResolvedValue([]);
      mockSessionRepo.findOne.mockResolvedValue({
        id: sessionId,
        discountServices: '',
        discountTeams: '',
      });

      const result = await helper.getJornadasTableDetail(sessionId);

      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });
  });
});
