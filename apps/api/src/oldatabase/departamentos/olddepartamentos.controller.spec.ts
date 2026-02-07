import { Test, TestingModule } from '@nestjs/testing';
import { OldDepartamentosController } from './olddepartamentos.controller';
import { OldDepartamentosService } from './olddepartamentos.service';
import { OldDepartamento } from './entities/olddepartamento.entity';

describe('OldDepartamentosController', () => {
  let controller: OldDepartamentosController;
  let service: OldDepartamentosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OldDepartamentosController],
      providers: [
        {
          provide: OldDepartamentosService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(OldDepartamentosController);
    service = module.get(OldDepartamentosService);
  });

  it('findAll retorna la lista del servicio', async () => {
    const departamentos: OldDepartamento[] = [
      { id: 1, nombre: 'Servicios Operativos' },
    ];
    jest.spyOn(service, 'findAll').mockResolvedValue(departamentos);

    await expect(controller.findAll()).resolves.toBe(departamentos);
  });

  it('findById retorna un departamento por id', async () => {
    const departamento: OldDepartamento = {
      id: 2,
      nombre: 'Limpieza',
    };
    jest.spyOn(service, 'findById').mockResolvedValue(departamento);

    await expect(controller.findById(2)).resolves.toBe(departamento);
  });
});
