import { Test, TestingModule } from '@nestjs/testing';
import { JornadasParserService } from './jornadas-parser.service';
import * as XLSX from 'xlsx';

// Mock de la librería xlsx
jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

describe('JornadasParserService', () => {
  let service: JornadasParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JornadasParserService],
    }).compile();

    service = module.get<JornadasParserService>(JornadasParserService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseExcel', () => {
    it('debería leer el archivo Excel y devolver un array de objetos', () => {
      const mockFilePath = '/tmp/test.xlsx';
      const mockData = [
        { ID: 1, Nombre: 'Test' },
        { ID: 2, Nombre: 'Test 2' },
      ];

      // Simulamos la estructura interna de un Workbook de SheetJS
      const mockWorkbook = {
        SheetNames: ['Hoja1'],
        Sheets: {
          Hoja1: { '!ref': 'A1:B3' }, // Objeto hoja simulado
        },
      };

      (XLSX.readFile as jest.Mock).mockReturnValue(mockWorkbook);
      (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);

      const result = service.parseExcel(mockFilePath);

      expect(XLSX.readFile).toHaveBeenCalledWith(mockFilePath, {
        cellDates: true,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(XLSX.utils.sheet_to_json).toHaveBeenCalledWith(
        mockWorkbook.Sheets['Hoja1'],
        { defval: null },
      );
      expect(result).toEqual(mockData);
    });

    it('debería propagar errores si XLSX.readFile falla (ej: archivo no encontrado)', () => {
      const error = new Error('File not found');
      (XLSX.readFile as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      expect(() => service.parseExcel('invalid.xlsx')).toThrow(error);
    });
  });
});
