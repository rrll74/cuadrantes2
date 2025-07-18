import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permiso } from './entities/permiso.entity';

@Injectable()
export class PermisosService {
  constructor(
    @InjectRepository(Permiso, 'new')
    private permisosRepository: Repository<Permiso>,
  ) {}
  async findAll(): Promise<Permiso[]> {
    return this.permisosRepository.find({
      select: {
        id: true,
        tipo: true,
        descripcion: true,
        restringido: true,
      },
      relations: {
        users: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }
}
