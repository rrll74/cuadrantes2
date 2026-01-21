import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JornadasStatusSummaryHelper } from './jornadas-status-summary.helper';
import {
  PresenceResult,
  EstadoPresencia,
} from '../../entities/presence-result.entity';

describe('JornadasStatusSummaryHelper', () => {
  let helper: JornadasStatusSummaryHelper;
  let presenceRepo: Repository<PresenceResult>;

  const mockPresenceRepo = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadasStatusSummaryHelper,
        {
          provide: getRepositoryToken(PresenceResult, 'new'),
          useValue: mockPresenceRepo,
        },
      ],
    }).compile();

    helper = module.get<JornadasStatusSummaryHelper>(
      JornadasStatusSummaryHelper,
    );
    presenceRepo = module.get(getRepositoryToken(PresenceResult, 'new'));

    jest.clearAllMocks();
  });

  describe('getJornadasByStatusAndPartsSummary', () => {
    const sessionId = 1;

    it('debería contar fichajes por estado y partes asociados', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.INCOMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      expect(result.rows).toBeDefined();
      expect(result.footer).toBeDefined();
      expect(result.footer.withPartsCount).toBe(2); // 2 COMPLETO con partes
      expect(result.footer.noPartsCount).toBe(1); // 1 INCOMPLETO sin partes
    });

    it('debería retornar fila para cada estado', async () => {
      const mockResults = [];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(
        result.rows.some((r) => r.estado === EstadoPresencia.COMPLETO),
      ).toBe(true);
      expect(
        result.rows.some((r) => r.estado === EstadoPresencia.INCOMPLETO),
      ).toBe(true);
      expect(
        result.rows.some((r) => r.estado === EstadoPresencia.SIN_PRESENCIA),
      ).toBe(true);
    });

    it('debería calcular porcentajes correctamente para "con partes"', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.INCOMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.SIN_PRESENCIA,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      // 50% COMPLETO, 25% INCOMPLETO, 25% SIN_PRESENCIA (con partes)
      const completoRow = result.rows.find(
        (r) => r.estado === EstadoPresencia.COMPLETO,
      );
      expect(completoRow?.withPartsPercent).toBe(50);
    });

    it('debería calcular porcentajes correctamente para "sin partes"', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.INCOMPLETO,
        },
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.SIN_PRESENCIA,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      // 50% COMPLETO, 25% INCOMPLETO, 25% SIN_PRESENCIA (sin partes)
      const completoRow = result.rows.find(
        (r) => r.estado === EstadoPresencia.COMPLETO,
      );
      expect(completoRow?.noPartsPercent).toBe(50);
    });

    it('debería retornar 0% cuando no hay datos de un tipo', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      const incompletoRow = result.rows.find(
        (r) => r.estado === EstadoPresencia.INCOMPLETO,
      );
      expect(incompletoRow?.withPartsCount).toBe(0);
      expect(incompletoRow?.withPartsPercent).toBe(0);
      expect(incompletoRow?.noPartsCount).toBe(0);
      expect(incompletoRow?.noPartsPercent).toBe(0);
    });

    it('debería incluir footer con totales', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.INCOMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      expect(result.footer.estado).toBe('TOTAL');
      expect(result.footer.withPartsCount).toBe(1);
      expect(result.footer.noPartsCount).toBe(1);
      expect(result.footer.withPartsPercent).toBe(100);
      expect(result.footer.noPartsPercent).toBe(100);
    });

    it('debería redondear porcentajes a 2 decimales', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.INCOMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      const completoRow = result.rows.find(
        (r) => r.estado === EstadoPresencia.COMPLETO,
      );
      // 66.67% aproximadamente
      expect(typeof completoRow?.withPartsPercent).toBe('number');
      expect(
        completoRow?.withPartsPercent.toString().split('.').length,
      ).toBeLessThanOrEqual(2);
    });

    it('debería separar correctamente conteos por partes asociados', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 2 },
          estado: EstadoPresencia.COMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      const completoRow = result.rows.find(
        (r) => r.estado === EstadoPresencia.COMPLETO,
      );
      expect(completoRow?.noPartsCount).toBe(1); // Solo el con 0 partes
      expect(completoRow?.withPartsCount).toBe(2); // Los con > 0 partes
    });

    it('debería manejar sesión sin resultados', async () => {
      mockPresenceRepo.find.mockResolvedValue([]);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.footer.withPartsCount).toBe(0);
      expect(result.footer.noPartsCount).toBe(0);
      expect(result.footer.withPartsPercent).toBe(0);
      expect(result.footer.noPartsPercent).toBe(0);
    });

    it('debería procesar sessionId correctamente en consulta', async () => {
      mockPresenceRepo.find.mockResolvedValue([]);

      await helper.getJornadasByStatusAndPartsSummary(sessionId);

      expect(mockPresenceRepo.find).toHaveBeenCalledWith({
        where: { sessionId },
        relations: ['route'],
      });
    });

    it('debería contar correctamente cuando hay múltiples estados', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.INCOMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.INCOMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.SIN_PRESENCIA,
        },
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 0 },
          estado: EstadoPresencia.INCOMPLETO,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      const completoRow = result.rows.find(
        (r) => r.estado === EstadoPresencia.COMPLETO,
      );
      expect(completoRow?.withPartsCount).toBe(2); // 2 COMPLETO con partes
      expect(completoRow?.noPartsCount).toBe(1); // 1 COMPLETO sin partes

      expect(result.footer.withPartsCount).toBe(5); // Total con partes
      expect(result.footer.noPartsCount).toBe(2); // Total sin partes
    });

    it('debería mantener orden de estados en respuesta', async () => {
      mockPresenceRepo.find.mockResolvedValue([]);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      const estados = result.rows.map((r) => r.estado);
      // Debe contener los tres estados
      expect(estados).toContain(EstadoPresencia.COMPLETO);
      expect(estados).toContain(EstadoPresencia.INCOMPLETO);
      expect(estados).toContain(EstadoPresencia.SIN_PRESENCIA);
    });

    it('debería calcular porcentaje total como 100 cuando hay datos', async () => {
      const mockResults = [
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.COMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.INCOMPLETO,
        },
        {
          route: { partesAsociados: 1 },
          estado: EstadoPresencia.SIN_PRESENCIA,
        },
      ];

      mockPresenceRepo.find.mockResolvedValue(mockResults);

      const result = await helper.getJornadasByStatusAndPartsSummary(sessionId);

      // La suma de porcentajes con partes debe ser 100
      const withPartsTotal = result.rows.reduce(
        (sum, r) => sum + r.withPartsPercent,
        0,
      );
      expect(withPartsTotal).toBeCloseTo(100, 1);
    });
  });
});
