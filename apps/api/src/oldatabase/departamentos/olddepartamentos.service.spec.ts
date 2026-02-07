/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OldDepartamentosService } from './olddepartamentos.service';
import { OldDepartamento } from './entities/olddepartamento.entity';

describe('OldDepartamentosService', () => {
  let service: OldDepartamentosService;
  let repository: Repository<OldDepartamento>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OldDepartamentosService,
        {
          provide: getRepositoryToken(OldDepartamento, 'old'),
          useValue: {
            find: jest.fn(),
            findOneBy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OldDepartamentosService);
    repository = module.get(getRepositoryToken(OldDepartamento, 'old'));
  });

  it('findAll muestra todos y ordena por nombre', async () => {
    const expected = [{ id: 1, nombre: 'Servicios', activo: true }];
    jest.spyOn(repository, 'find').mockResolvedValue(expected);

    const result = await service.findAll();

    expect(repository.find).toHaveBeenCalledWith({
      order: { nombre: 'ASC' },
    });
    expect(result).toBe(expected);
  });

  it('findById delega en el repositorio', async () => {
    const expected = { id: 2, nombre: 'Limpieza', activo: true };
    jest.spyOn(repository, 'findOneBy').mockResolvedValue(expected);

    const result = await service.findById(2);

    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 2 });
    expect(result).toBe(expected);
  });
});
