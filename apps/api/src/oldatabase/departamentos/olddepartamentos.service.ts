import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OldDepartamento } from './entities/olddepartamento.entity';

@Injectable()
export class OldDepartamentosService {
  constructor(
    @InjectRepository(OldDepartamento, 'old')
    private departamentosRepository: Repository<OldDepartamento>,
  ) {}

  async findAll(): Promise<OldDepartamento[]> {
    return this.departamentosRepository.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async findById(id: number): Promise<OldDepartamento | null> {
    return this.departamentosRepository.findOneBy({ id });
  }
}
