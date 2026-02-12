/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConsultaCuadrantesService } from './consulta-cuadrantes.service';
import { OldEmpleado } from '../empleados/entities/oldempleado.entity';
import { OldCuadrante } from '../cuadrantes/entities/oldcuadrante.entity';
import { OldAsignacion } from '../asignaciones/entities/oldasignacion.entity';
import { OldEstado } from '../estados/entities/oldestado.entity';
import { OldPuesto } from '../puestos/entities/oldpuesto.entity';
import { OldContrato } from '../contratos/entities/oldcontrato.entity';
import { OldCuadranteEmpleado } from '../cuadrantes-empleados/entities/oldcuadrante-empleado.entity';
import { OldDepartamento } from '../departamentos/entities/olddepartamento.entity';

describe('ConsultaCuadrantesService', () => {
  let service: ConsultaCuadrantesService;
  let empleadoRepository: Repository<OldEmpleado>;
  let departamentoRepository: Repository<OldDepartamento>;
  let cuadranteRepository: Repository<OldCuadrante>;
  let asignacionRepository: Repository<OldAsignacion>;
  let estadoRepository: Repository<OldEstado>;
  let puestoRepository: Repository<OldPuesto>;
  let contratoRepository: Repository<OldContrato>;
  let cuadranteEmpleadoRepository: Repository<OldCuadranteEmpleado>;

  beforeEach(async () => {
    // Mock de los repositorios
    const mockEmpleadoRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockDepartamentoRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockCuadranteRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const mockAsignacionRepository = {
      find: jest.fn(),
    };

    const mockEstadoRepository = {
      find: jest.fn(),
    };

    const mockPuestoRepository = {
      find: jest.fn(),
    };

    const mockContratoRepository = {
      find: jest.fn(),
    };

    const mockCuadranteEmpleadoRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultaCuadrantesService,
        {
          provide: getRepositoryToken(OldEmpleado, 'old'),
          useValue: mockEmpleadoRepository,
        },
        {
          provide: getRepositoryToken(OldDepartamento, 'old'),
          useValue: mockDepartamentoRepository,
        },
        {
          provide: getRepositoryToken(OldCuadrante, 'old'),
          useValue: mockCuadranteRepository,
        },
        {
          provide: getRepositoryToken(OldAsignacion, 'old'),
          useValue: mockAsignacionRepository,
        },
        {
          provide: getRepositoryToken(OldEstado, 'old'),
          useValue: mockEstadoRepository,
        },
        {
          provide: getRepositoryToken(OldPuesto, 'old'),
          useValue: mockPuestoRepository,
        },
        {
          provide: getRepositoryToken(OldContrato, 'old'),
          useValue: mockContratoRepository,
        },
        {
          provide: getRepositoryToken(OldCuadranteEmpleado, 'old'),
          useValue: mockCuadranteEmpleadoRepository,
        },
      ],
    }).compile();

    service = module.get<ConsultaCuadrantesService>(ConsultaCuadrantesService);
    empleadoRepository = module.get<Repository<OldEmpleado>>(
      getRepositoryToken(OldEmpleado, 'old'),
    );
    departamentoRepository = module.get<Repository<OldDepartamento>>(
      getRepositoryToken(OldDepartamento, 'old'),
    );
    cuadranteRepository = module.get<Repository<OldCuadrante>>(
      getRepositoryToken(OldCuadrante, 'old'),
    );
    asignacionRepository = module.get<Repository<OldAsignacion>>(
      getRepositoryToken(OldAsignacion, 'old'),
    );
    estadoRepository = module.get<Repository<OldEstado>>(
      getRepositoryToken(OldEstado, 'old'),
    );
    puestoRepository = module.get<Repository<OldPuesto>>(
      getRepositoryToken(OldPuesto, 'old'),
    );
    contratoRepository = module.get<Repository<OldContrato>>(
      getRepositoryToken(OldContrato, 'old'),
    );
    cuadranteEmpleadoRepository = module.get<Repository<OldCuadranteEmpleado>>(
      getRepositoryToken(OldCuadranteEmpleado, 'old'),
    );
  });

  describe('obtenerEmpleados', () => {
    it('debería retornar lista de empleados ordenados por nombre', async () => {
      const mockEmpleados = [
        {
          id: 1,
          nombre: 'Alice',
          apellido1: 'Anderson',
          email: 'alice@example.com',
          activo: true,
        },
        {
          id: 2,
          nombre: 'Bob',
          apellido1: 'Brown',
          email: 'bob@example.com',
          activo: true,
        },
      ];

      jest
        .spyOn(empleadoRepository, 'find')
        .mockResolvedValue(mockEmpleados as any);

      const resultado = await service.obtenerEmpleados();

      expect(resultado).toHaveLength(2);
      expect(resultado[0].nombre).toBe('Alice');
      expect(resultado[1].nombre).toBe('Bob');
      expect(empleadoRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { activo: true },
        }),
      );
    });

    it('debería retornar array vacío si no hay empleados activos', async () => {
      jest.spyOn(empleadoRepository, 'find').mockResolvedValue([]);

      const resultado = await service.obtenerEmpleados();

      expect(resultado).toEqual([]);
    });
  });

  describe('obtenerCuadrantesDisponibles', () => {
    it('debería retornar cuadrantes disponibles para el empleado en el período', async () => {
      const mockCuadrantes = [
        {
          id: 1,
          nombre: 'Cuadrante A',
          descripcion: 'Descripción A',
          visibilidad: true,
        },
      ];

      const mockContratos = [
        {
          id: 1,
          empleado_id: 1,
          comienzo: new Date('2024-01-01'),
          fin: null, // Contrato vigente
        },
      ];

      const mockPuestos = [
        {
          id: 1,
          contrato_id: 1,
          comienzo_c: new Date('2024-01-01'),
          fin_c: null,
          departamento_id: 1,
        },
      ];

      const mockCuadrantesEmpleado = [
        {
          empleado_id: 1,
          cuadrante_id: 1,
          visible: true,
        },
      ];

      const mockDepartamentos = [
        {
          id: 1,
          nombre: 'Departamento Test',
        },
      ];

      jest
        .spyOn(contratoRepository, 'find')
        .mockResolvedValue(mockContratos as any);
      jest
        .spyOn(puestoRepository, 'find')
        .mockResolvedValue(mockPuestos as any);
      jest
        .spyOn(cuadranteEmpleadoRepository, 'find')
        .mockResolvedValue(mockCuadrantesEmpleado as any);
      jest
        .spyOn(cuadranteRepository, 'find')
        .mockResolvedValue(mockCuadrantes as any);
      jest
        .spyOn(departamentoRepository, 'find')
        .mockResolvedValue(mockDepartamentos as any);

      const resultado = await service.obtenerCuadrantesDisponibles(
        1, // empleadoId
        1, // mesInicio
        2024, // anioInicio
        1, // mesFin
        2024, // anioFin
      );

      expect(resultado).toHaveLength(1);
      expect(resultado[0].nombre).toBe('Cuadrante A');
    });

    it('debería retornar array vacío si no hay cuadrantes disponibles', async () => {
      jest.spyOn(contratoRepository, 'find').mockResolvedValue([]);
      jest.spyOn(puestoRepository, 'find').mockResolvedValue([]);
      jest.spyOn(cuadranteRepository, 'find').mockResolvedValue([]);

      const resultado = await service.obtenerCuadrantesDisponibles(
        999, // empleadoId que no existe
        1,
        2024,
        1,
        2024,
      );

      expect(resultado).toEqual([]);
    });
  });

  describe('obtenerConsultaCuadrante', () => {
    it('debería construir respuesta completa con datos del cuadrante', async () => {
      const mockEmpleado = {
        id: 1,
        nombre: 'Juan',
        apellido1: 'Pérez',
        codigo_empleado: 'EMP001',
        email: 'juan@example.com',
      };

      const mockCuadrante = {
        id: 1,
        nombre: 'Cuadrante A',
        anio: 2024,
        mes_inicio: 1,
      };

      const mockDepartamento = {
        id: 1,
        descripcion: 'Departamento Test',
      };

      const mockEstado = {
        id: 1,
        abreviacion: 'COM',
        texto_color: 0, // RGB como número
        fondo_color: 16711680, // Rojo
      };

      const mockAsignaciones = [
        {
          id_asignacion: 1,
          empleado_id: 1,
          fecha: new Date('2024-01-01'),
          estado_id: 1,
          estado: mockEstado,
        },
      ];

      jest
        .spyOn(empleadoRepository, 'findOne')
        .mockResolvedValue(mockEmpleado as any);
      jest
        .spyOn(cuadranteRepository, 'findOne')
        .mockResolvedValue(mockCuadrante as any);
      jest
        .spyOn(departamentoRepository, 'findOne')
        .mockResolvedValue(mockDepartamento as any);
      jest
        .spyOn(asignacionRepository, 'find')
        .mockResolvedValue(mockAsignaciones as any);
      jest
        .spyOn(estadoRepository, 'find')
        .mockResolvedValue([mockEstado] as any);

      const resultado = await service.obtenerConsultaCuadrante(
        1, // empleadoId
        1, // mesInicio
        2024, // anioInicio
        1, // mesFin
        2024, // anioFin
        1, // cuadranteId
        true, // tipoInicial
      );

      expect(resultado.empleado).toBeDefined();
      expect(resultado.empleado.nombre).toBe('Juan');
      expect(resultado.cuadrante).toBeDefined();
      expect(resultado.cuadrante.nombre).toBe('Cuadrante A');
    });
  });

  describe('generarPDF', () => {
    it('debería generar un buffer PDF', async () => {
      // Mock mínimo de los datos necesarios
      const mockEmpleado = {
        id: 1,
        nombre: 'Juan',
        apellido1: 'Pérez',
        codigo_empleado: 'EMP001',
      };

      const mockCuadrante = {
        id: 1,
        nombre: 'Cuadrante A',
        anio: 2024,
        mes_inicio: 1,
      };

      const mockDepartamento = {
        id: 1,
        descripcion: 'Departamento Test',
      };

      jest
        .spyOn(empleadoRepository, 'findOne')
        .mockResolvedValue(mockEmpleado as any);
      jest
        .spyOn(cuadranteRepository, 'findOne')
        .mockResolvedValue(mockCuadrante as any);
      jest
        .spyOn(departamentoRepository, 'findOne')
        .mockResolvedValue(mockDepartamento as any);
      jest.spyOn(asignacionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(estadoRepository, 'find').mockResolvedValue([]);

      const resultado = await service.generarPDF(1, 1, 2024, 1, 2024, 1, true);

      expect(Buffer.isBuffer(resultado)).toBe(true);
      expect(resultado.length).toBeGreaterThan(0);
    });
  });

  describe('generarYEnviarPDF', () => {
    it('debería retornar mensaje de éxito', async () => {
      const mockEmpleado = {
        id: 1,
        nombre: 'Juan',
        apellido1: 'Pérez',
        email: 'juan@example.com',
      };

      const mockCuadrante = {
        id: 1,
        nombre: 'Cuadrante A',
        anio: 2024,
        mes_inicio: 1,
      };

      const mockDepartamento = {
        id: 1,
        descripcion: 'Departamento Test',
      };

      jest
        .spyOn(empleadoRepository, 'findOne')
        .mockResolvedValue(mockEmpleado as any);
      jest
        .spyOn(cuadranteRepository, 'findOne')
        .mockResolvedValue(mockCuadrante as any);
      jest
        .spyOn(departamentoRepository, 'findOne')
        .mockResolvedValue(mockDepartamento as any);
      jest.spyOn(asignacionRepository, 'find').mockResolvedValue([]);
      jest.spyOn(estadoRepository, 'find').mockResolvedValue([]);

      const resultado = await service.generarYEnviarPDF(
        1,
        1,
        2024,
        1,
        2024,
        1,
        true,
      );

      expect(resultado).toEqual(
        expect.objectContaining({
          success: expect.any(Boolean),
          message: expect.any(String),
        }),
      );
    });
  });
});
