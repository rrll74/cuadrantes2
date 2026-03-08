/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { EXCEL_COLUMNS, IMPORT_TYPES } from '@cuadrantes/shared-dto';
import {
  JornadasImportService,
  UploadedFiles,
} from './jornadas-import.service';
import { JornadasParserService } from './jornadas-parser.service';
import { JornadasMatchingService } from './jornadas-matcher.service';
import { ImportSession } from '../entities/import-session.entity';
import { ScheduledRoute } from '../entities/scheduled-route.entity';
import { RawWorker } from '../entities/raw-worker.entity';
import { RawClockIn } from '../entities/raw-clock-in.entity';
import { JornadasTextParserService } from './jornadas-text-parser.service';

describe('JornadasImportService', () => {
  let service: JornadasImportService;
  let matchingService: JornadasMatchingService;

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  const mockParserService = {
    parseExcel: jest.fn(),
    validateHeaders: jest.fn(),
    parseWorkerCombined: jest.fn(),
  };

  const mockTextParserService = {
    parseTextFile: jest.fn(),
    validateTextFile: jest.fn(),
  };

  const mockMatchingService = {
    match: jest
      .fn()
      .mockReturnValue({ results: [], usedClockInIds: new Set<number>() }),
    matchSinRutas: jest.fn().mockReturnValue([]),
  };

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
  };

  const mockFile = {
    path: 'path/to/file.xlsx',
    size: 100,
  } as Express.Multer.File;
  const mockTxtFile = {
    path: 'path/to/rutas.txt',
    size: 100,
  } as Express.Multer.File;

  const validFilesType1: UploadedFiles = {
    titulares: [mockFile],
    auxiliares: [mockFile],
    trabajadores: [mockFile],
    fichajes: [mockFile],
  };

  const validFilesType2: UploadedFiles = {
    trabajadores: [mockFile],
    fichajes: [mockFile],
    rutas: [mockFile],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JornadasImportService,
        {
          provide: getRepositoryToken(ImportSession, 'new'),
          useValue: mockRepo,
        },
        {
          provide: getRepositoryToken(ScheduledRoute, 'new'),
          useValue: mockRepo,
        },
        { provide: getRepositoryToken(RawWorker, 'new'), useValue: mockRepo },
        { provide: getRepositoryToken(RawClockIn, 'new'), useValue: mockRepo },
        { provide: getDataSourceToken('new'), useValue: mockDataSource },
        { provide: JornadasParserService, useValue: mockParserService },
        { provide: JornadasTextParserService, useValue: mockTextParserService },
        { provide: JornadasMatchingService, useValue: mockMatchingService },
      ],
    }).compile();

    service = module.get<JornadasImportService>(JornadasImportService);
    matchingService = module.get<JornadasMatchingService>(
      JornadasMatchingService,
    );

    mockTextParserService.validateTextFile.mockReturnValue(true);
    mockTextParserService.parseTextFile.mockReturnValue(new Set<number>());
  });

  describe('procesarArchivos', () => {
    it('deberia enrutar a importacion tipo 1', async () => {
      const spyPrimary = jest
        .spyOn(service, 'procesarArchivosPrimarios')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockResolvedValue({ success: true } as any);

      await service.procesarArchivos(
        validFilesType1,
        1,
        undefined,
        IMPORT_TYPES.PRIMARY,
      );

      expect(spyPrimary).toHaveBeenCalledWith(validFilesType1, 1, undefined);
    });

    it('deberia enrutar a importacion tipo 2', async () => {
      const spySecondary = jest
        .spyOn(service, 'procesarArchivosSecundarios')
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .mockResolvedValue({ success: true } as any);

      await service.procesarArchivos(
        validFilesType2,
        1,
        undefined,
        IMPORT_TYPES.SECONDARY,
      );

      expect(spySecondary).toHaveBeenCalledWith(validFilesType2, 1, undefined);
    });

    it('deberia lanzar BadRequestException para tipo de importacion invalido', async () => {
      await expect(
        service.procesarArchivos(validFilesType1, 1, undefined, 999),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('procesarArchivosPrimarios', () => {
    it('deberia lanzar BadRequestException si faltan archivos requeridos', async () => {
      const invalidFiles = { ...validFilesType1, trabajadores: undefined };

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.procesarArchivosPrimarios(invalidFiles as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deberia hacer rollback si la validacion de cabeceras falla', async () => {
      mockParserService.parseExcel.mockReturnValueOnce([
        { [EXCEL_COLUMNS.TRABAJADOR.ID]: 1 },
      ]);
      mockParserService.validateHeaders.mockImplementationOnce(() => {
        throw new BadRequestException('Cabeceras invalidas');
      });

      await expect(
        service.procesarArchivosPrimarios(validFilesType1),
      ).rejects.toThrow(BadRequestException);

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('deberia procesar correctamente archivos tipo 1 (happy path)', async () => {
      mockParserService.parseExcel
        .mockReturnValueOnce([
          {
            [EXCEL_COLUMNS.TRABAJADOR.ID]: 1,
            [EXCEL_COLUMNS.TRABAJADOR.NOMBRE]: 'Juan',
            [EXCEL_COLUMNS.TRABAJADOR.APELLIDO1]: 'Perez',
            [EXCEL_COLUMNS.TRABAJADOR.APELLIDO2]: 'Garcia',
            [EXCEL_COLUMNS.TRABAJADOR.PUESTO]: 'Conductor',
            [EXCEL_COLUMNS.TRABAJADOR.EQUAL]: 1,
          },
        ])
        .mockReturnValueOnce([
          {
            [EXCEL_COLUMNS.FICHAJE.ID_TRABAJADOR]: 1,
            [EXCEL_COLUMNS.FICHAJE.EVENTO]: 'Entrada',
            [EXCEL_COLUMNS.FICHAJE.FECHA_HORA]: '2023-01-01T08:00:00',
          },
        ])
        .mockReturnValueOnce([
          {
            [EXCEL_COLUMNS.RUTATITULAR.TRABAJADOR]: '1 - Juan',
            [EXCEL_COLUMNS.RUTATITULAR.FECHA]: '2023-01-01',
            [EXCEL_COLUMNS.RUTATITULAR.HOJARUTA]: 'HR1',
            [EXCEL_COLUMNS.RUTATITULAR.SERVICIO]: 'S1',
            [EXCEL_COLUMNS.RUTATITULAR.TURNO]: 'M',
            [EXCEL_COLUMNS.RUTATITULAR.EQUIPO]: 'E1',
            [EXCEL_COLUMNS.RUTATITULAR.INICIO]: '2023-01-01T08:00:00',
            [EXCEL_COLUMNS.RUTATITULAR.FIN]: '2023-01-01T14:00:00',
            [EXCEL_COLUMNS.RUTATITULAR.VEHICULO]: 'V1',
            [EXCEL_COLUMNS.RUTATITULAR.KMS]: 100,
            [EXCEL_COLUMNS.RUTATITULAR.PARTES_ASOCIADOS]: 0,
          },
        ])
        .mockReturnValueOnce([]);

      const result = await service.procesarArchivosPrimarios(
        validFilesType1,
        1,
      );

      expect(result.success).toBe(true);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(6);
      expect(matchingService.match).toHaveBeenCalled();
      expect(matchingService.matchSinRutas).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('procesarArchivosSecundarios', () => {
    it('deberia lanzar BadRequestException si faltan archivos requeridos', async () => {
      const invalidFiles = { ...validFilesType2, rutas: undefined };

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.procesarArchivosSecundarios(invalidFiles as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('deberia rechazar rutasDocumento con formato invalido', async () => {
      mockParserService.parseExcel
        .mockReturnValueOnce([
          {
            [EXCEL_COLUMNS.TRABAJADOR_TIPO2.TRABAJADOR_COMBINED]:
              '123 - Perez Juan (Conductor) (123)',
            [EXCEL_COLUMNS.TRABAJADOR_TIPO2.FECHA_INICIO]: '2024-01-01',
          },
        ])
        .mockReturnValueOnce([
          {
            [EXCEL_COLUMNS.FICHAJE_TIPO2.ID_TRABAJADOR]: 123,
            [EXCEL_COLUMNS.FICHAJE_TIPO2.EVENTO]: 'Entrada',
            [EXCEL_COLUMNS.FICHAJE_TIPO2.FECHA_HORA]: '2024-01-01T08:00:00',
          },
        ]);
      mockParserService.parseWorkerCombined.mockReturnValue({
        id: '123',
        nombre: 'Juan',
        apellidos: 'Perez',
        puesto: 'Conductor',
      });
      mockTextParserService.validateTextFile.mockReturnValue(false);

      const files = {
        ...validFilesType2,
        rutasDocumento: [mockTxtFile],
      };

      await expect(service.procesarArchivosSecundarios(files)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockTextParserService.parseTextFile).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('deberia procesar correctamente archivos tipo 2 con rutasDocumento', async () => {
      mockParserService.parseWorkerCombined.mockReturnValue({
        id: '123',
        nombre: 'Juan',
        apellidos: 'Perez',
        puesto: 'Conductor',
      });

      mockParserService.parseExcel
        .mockReturnValueOnce([
          {
            [EXCEL_COLUMNS.TRABAJADOR_TIPO2.TRABAJADOR_COMBINED]:
              '123 - Perez Juan (Conductor) (123)',
            [EXCEL_COLUMNS.TRABAJADOR_TIPO2.FECHA_INICIO]: '2024-01-01',
          },
        ])
        .mockReturnValueOnce([
          {
            [EXCEL_COLUMNS.FICHAJE_TIPO2.ID_TRABAJADOR]: 123,
            [EXCEL_COLUMNS.FICHAJE_TIPO2.EVENTO]: 'Entrada',
            [EXCEL_COLUMNS.FICHAJE_TIPO2.FECHA_HORA]: '2024-01-01T08:00:00',
          },
        ])
        .mockReturnValueOnce([
          {
            [EXCEL_COLUMNS.RUTA_TIPO2.FECHA]: '2024-01-01',
            [EXCEL_COLUMNS.RUTA_TIPO2.SERVICIO]: 'S1',
            [EXCEL_COLUMNS.RUTA_TIPO2.EQUIPO]: 'E1',
            [EXCEL_COLUMNS.RUTA_TIPO2.TURNO]: 'M',
            [EXCEL_COLUMNS.RUTA_TIPO2.INICIO]: '08:00:00',
            [EXCEL_COLUMNS.RUTA_TIPO2.FIN]: '14:00:00',
            [EXCEL_COLUMNS.RUTA_TIPO2.TRABAJADOR]: '123 - Juan',
            [EXCEL_COLUMNS.RUTA_TIPO2.HOJARUTA]: 500,
            [EXCEL_COLUMNS.RUTA_TIPO2.AUXILIAR1]: null,
            [EXCEL_COLUMNS.RUTA_TIPO2.AUXILIAR2]: null,
          },
        ]);

      mockTextParserService.validateTextFile.mockReturnValue(true);
      mockTextParserService.parseTextFile.mockReturnValue(
        new Set<number>([500]),
      );

      const files = {
        ...validFilesType2,
        rutasDocumento: [mockTxtFile],
      };

      const result = await service.procesarArchivosSecundarios(files, 1);

      expect(result.success).toBe(true);
      expect(result.stats.rutasConDocumento).toBe(1);
      expect(mockTextParserService.validateTextFile).toHaveBeenCalledWith(
        mockTxtFile.path,
      );
      expect(mockTextParserService.parseTextFile).toHaveBeenCalledWith(
        mockTxtFile.path,
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
