/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { QueryRunner } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
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

// Mock de fs para evitar operaciones reales en disco
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock de shared-dto para controlar las columnas esperadas en la validación
jest.mock('@cuadrantes/shared-dto', () => ({
  EXCEL_COLUMNS: {
    TRABAJADOR: {
      ID: 'ID',
      NOMBRE: 'Nombre',
      APELLIDO1: 'Apellido1',
      APELLIDO2: 'Apellido2',
      PUESTO: 'Puesto',
      EQUAL: 'Equal',
    },
    FICHAJE: {
      ID_TRABAJADOR: 'ID_Trabajador',
      EVENTO: 'Evento',
      FECHA_HORA: 'Fecha_Hora',
    },
    RUTATITULAR: {
      TRABAJADOR: 'Trabajador',
      FECHA: 'Fecha',
      HOJARUTA: 'HojaRuta',
      SERVICIO: 'Servicio',
      TURNO: 'Turno',
      EQUIPO: 'Equipo',
      INICIO: 'Inicio',
      FIN: 'Fin',
      VEHICULO: 'Vehiculo',
      KMS: 'Kms',
      PARTES_ASOCIADOS: 'PartesAsociados',
    },
    RUTAAUXILIAR: {
      TRABAJADOR: 'Trabajador',
      FECHA: 'Fecha',
      HOJARUTA: 'HojaRuta',
    },
  },
}));

describe('JornadasImportService', () => {
  let service: JornadasImportService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let parserService: JornadasParserService;
  let matchingService: JornadasMatchingService;
  let queryRunner: QueryRunner;

  // Mock del QueryRunner para controlar transacciones
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
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
    // Obtenemos la referencia al queryRunner creado por el dataSource mockeado
    queryRunner = mockDataSource.createQueryRunner();
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      await expect(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        service.procesarArchivos(invalidFiles as any),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException y hacer rollback si la validación de cabeceras falla', async () => {
      // Mockear parser para devolver datos sin las columnas requeridas
      mockParserService.parseExcel.mockReturnValueOnce([
        { COLUMNA_INCORRECTA: 'valor' },
      ]);

      await expect(service.procesarArchivos(validFiles)).rejects.toThrow(
        BadRequestException,
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('debería procesar correctamente los archivos y confirmar la transacción (Happy Path)', async () => {
      // Mockear parser para devolver datos válidos en orden de llamada
      // 1. Trabajadores
      mockParserService.parseExcel.mockReturnValueOnce([
        { ID: 1, Nombre: 'Juan', Apellido1: 'Perez', Puesto: 'Conductor' },
      ]);
      // 2. Fichajes
      mockParserService.parseExcel.mockReturnValueOnce([
        {
          ID_Trabajador: 1,
          Evento: 'Entrada',
          Fecha_Hora: '2023-01-01T08:00:00',
        },
      ]);
      // 3. Titulares
      mockParserService.parseExcel.mockReturnValueOnce([
        {
          Trabajador: '1 - Juan',
          Fecha: '2023-01-01',
          HojaRuta: 'HR1',
          Servicio: 'S1',
          Turno: 'M',
          Equipo: 'E1',
          Inicio: '2023-01-01T08:00:00',
          Fin: '2023-01-01T14:00:00',
        },
      ]);
      // 4. Auxiliares
      mockParserService.parseExcel.mockReturnValueOnce([]);

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await service.procesarArchivos(validFiles, 1);

      expect(result.success).toBe(true);
      expect(queryRunner.startTransaction).toHaveBeenCalled();

      // Verificar que se guardan todas las entidades en orden:
      // Session, Workers, ClockIns, Routes, Results, Unmatched
      expect(queryRunner.manager.save).toHaveBeenCalledTimes(6);

      expect(matchingService.match).toHaveBeenCalled();
      expect(matchingService.matchSinRutas).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledTimes(4); // Limpieza de archivos
    });

    it('debería hacer rollback si ocurre un error de base de datos durante el guardado', async () => {
      // Mockear parser OK para pasar validaciones iniciales
      mockParserService.parseExcel.mockReturnValue([
        { ID: 1, Nombre: 'Juan', Apellido1: 'Perez', Puesto: 'Conductor' },
      ]);

      // Simular error al guardar la sesión (primer save)
      (queryRunner.manager.save as jest.Mock<any, any>).mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(service.procesarArchivos(validFiles)).rejects.toThrow(
        'DB Error',
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });
});
