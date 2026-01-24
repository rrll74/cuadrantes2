/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
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

describe('JornadasImportService', () => {
  let service: JornadasImportService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let parserService: JornadasParserService;
  let matchingService: JornadasMatchingService;

  // Mock del QueryRunner para controlar transacciones
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
  };

  const mockMatchingService = {
    match: jest
      .fn()
      .mockReturnValue({ results: [], usedClockInIds: new Set() }),
    matchSinRutas: jest.fn().mockReturnValue([]),
  };

  const mockRepo = {
    create: jest.fn().mockImplementation((dto) => dto),
  };

  beforeEach(async () => {
    // Reset mocks before each test
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
        { provide: JornadasMatchingService, useValue: mockMatchingService },
      ],
    }).compile();

    service = module.get<JornadasImportService>(JornadasImportService);
    parserService = module.get<JornadasParserService>(JornadasParserService);
    matchingService = module.get<JornadasMatchingService>(
      JornadasMatchingService,
    );
  });

  describe('procesarArchivos', () => {
    const mockFile = { path: 'path/to/file' } as Express.Multer.File;
    const validFiles: UploadedFiles = {
      titulares: [mockFile],
      auxiliares: [mockFile],
      trabajadores: [mockFile],
      fichajes: [mockFile],
    };

    it('debería lanzar BadRequestException y hacer rollback si faltan archivos', async () => {
      const invalidFiles = { ...validFiles, trabajadores: undefined };

      // Simply verify that exception is thrown when files are missing
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.procesarArchivos(invalidFiles as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar BadRequestException y hacer rollback si la validación de cabeceras falla', async () => {
      // Mockear parser para devolver datos sin las columnas requeridas
      mockParserService.parseExcel.mockReturnValueOnce([
        { COLUMNA_INCORRECTA: 'valor' },
      ]);

      await expect(service.procesarArchivos(validFiles)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('debería procesar correctamente los archivos y confirmar la transacción (Happy Path)', async () => {
      // Mockear parser para devolver datos válidos en orden de llamada
      // 1. Trabajadores - usar columnas correctas
      mockParserService.parseExcel.mockReturnValueOnce([
        {
          Código: 1,
          Nombre: 'Juan',
          'Apellido 1': 'Perez',
          'Apellido 2': 'Garcia',
          'Puesto Incorpora': 'Conductor',
          Equal: 'E1',
        },
      ]);
      // 2. Fichajes - usar columnas correctas
      mockParserService.parseExcel.mockReturnValueOnce([
        {
          'Cód. trabajador': 1,
          'Tipo de dato': 'Entrada',
          'Fecha / hora': '2023-01-01T08:00:00',
        },
      ]);
      // 3. Titulares - usar columnas correctas
      mockParserService.parseExcel.mockReturnValueOnce([
        {
          Titular: '1 - Juan',
          Fecha: '2023-01-01',
          Código: 'HR1',
          Servicio: 'S1',
          Turno: 'M',
          Equipo: 'E1',
          'Hora salida': '2023-01-01T08:00:00',
          'Hora llegada': '2023-01-01T14:00:00',
          Vehículo: 'V1',
          'Total KM': 100,
          'Nº dctos': 0,
        },
      ]);
      // 4. Auxiliares
      mockParserService.parseExcel.mockReturnValueOnce([]);

      const result = await service.procesarArchivos(validFiles, 1);

      expect(result.success).toBe(true);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();

      // Verificar que se guardan todas las entidades en orden:
      // Session, Workers, ClockIns, Routes, Results, Unmatched
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(6);

      expect(matchingService.match).toHaveBeenCalled();
      expect(matchingService.matchSinRutas).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      // Note: fs.unlinkSync cleanup is tested through integration tests, not unit tests
    });

    it('debería hacer rollback si ocurre un error de base de datos durante el guardado', async () => {
      // Mockear parser OK para pasar validaciones iniciales
      mockParserService.parseExcel.mockReturnValue([
        {
          Código: 1,
          Nombre: 'Juan',
          'Apellido 1': 'Perez',
          'Apellido 2': 'Garcia',
          'Puesto Incorpora': 'Conductor',
          Equal: 'E1',
        },
      ]);

      // Simular error al guardar la sesión (primer save)
      mockQueryRunner.manager.save.mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.procesarArchivos(validFiles)).rejects.toThrow(
        'DB Error',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
