/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { JornadasExportService } from './jornadas-export.service';
import * as ExcelJS from 'exceljs';
import { EstadoPresencia } from '../entities/presence-result.entity';

// Mock de ExcelJS
const mockCell = {
  numFmt: '',
  fill: {},
  alignment: {},
};

const mockRow = {
  font: {},
  alignment: {},
  getCell: jest.fn().mockReturnValue(mockCell),
};

const mockWorksheet = {
  columns: [],
  getRow: jest.fn().mockReturnValue(mockRow),
  addRow: jest.fn().mockReturnValue(mockRow),
};

const mockWorkbook = {
  addWorksheet: jest.fn().mockReturnValue(mockWorksheet),
  xlsx: {
    writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel-buffer')),
  },
};

jest.mock('exceljs', () => {
  return {
    Workbook: jest.fn().mockImplementation(() => mockWorkbook),
  };
});

describe('JornadasExportService', () => {
  let service: JornadasExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JornadasExportService],
    }).compile();

    service = module.get<JornadasExportService>(JornadasExportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateExcel', () => {
    it('debería generar un archivo Excel con los resultados proporcionados', async () => {
      const mockResults: any[] = [
        {
          ruta: {
            fechaGeneral: new Date('2023-01-01'),
            servicio: 'Servicio 1',
            turno: 'M',
            equipo: 'E1',
            inicio: new Date('2023-01-01T08:00:00'),
            fin: new Date('2023-01-01T15:00:00'),
            partesAsociados: 1,
          },
          trabajador: {
            nombre: 'Juan',
            apellido1: 'Perez',
            puesto: 'Conductor',
            equal: 100,
          },
          fichajeEntrada: new Date('2023-01-01T07:55:00'),
          fichajeSalida: new Date('2023-01-01T15:05:00'),
          estado: EstadoPresencia.COMPLETO,
          esDuplicado: false,
          revisar: false,
        },
      ];

      const buffer = await service.generateExcel(mockResults, []);

      expect(ExcelJS.Workbook).toHaveBeenCalled();
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Resultados');
      expect(mockWorksheet.addRow).toHaveBeenCalledTimes(1);
      expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled();
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('debería incluir la hoja de "Sin Ruta" si hay resultados unmatched', async () => {
      const mockResults: any[] = [];
      const mockUnmatched: any[] = [
        {
          fecha: new Date('2023-01-01'),
          trabajador: { nombre: 'Ana', apellido1: 'Gomez', puesto: 'Auxiliar' },
          fichajeEntrada: new Date('2023-01-01T08:00:00'),
          fichajeSalida: new Date('2023-01-01T15:00:00'),
          estado: EstadoPresencia.INCOMPLETO,
        },
      ];

      await service.generateExcel(mockResults, mockUnmatched);

      expect(mockWorkbook.addWorksheet).toHaveBeenCalledTimes(2);
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Resultados');
      expect(mockWorkbook.addWorksheet).toHaveBeenCalledWith('Sin Ruta');
      // 1 call for unmatched rows
      expect(mockWorksheet.addRow).toHaveBeenCalledTimes(1);
    });

    it('debería manejar correctamente los colores según el estado', async () => {
      const mockResults: any[] = [
        {
          ruta: {
            fechaGeneral: new Date(),
            inicio: new Date(),
            fin: new Date(),
          },
          trabajador: null,
          estado: EstadoPresencia.SIN_PRESENCIA,
        },
      ];

      await service.generateExcel(mockResults, []);

      expect(mockWorksheet.addRow).toHaveBeenCalled();
      // Verificamos que se accede a la celda de estado para darle formato
      expect(mockRow.getCell).toHaveBeenCalledWith('estado');
    });
  });
});
