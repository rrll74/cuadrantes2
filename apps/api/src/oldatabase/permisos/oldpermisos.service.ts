import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OldPermiso } from './entities/oldpermiso.entity';

@Injectable()
export class OldPermisosService {
  constructor(
    @InjectRepository(OldPermiso, 'old')
    private oldPermisosRepository: Repository<OldPermiso>,
  ) {}

  async findAll(): Promise<OldPermiso[]> {
    return this.oldPermisosRepository.find({
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

  // Aquí se añaden más métodos
}
