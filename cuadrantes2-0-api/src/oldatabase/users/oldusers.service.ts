import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OldUser } from './entities/olduser.entity';

@Injectable()
export class OldUsersService {
  constructor(
    @InjectRepository(OldUser, 'old')
    private oldUsersRepository: Repository<OldUser>,
  ) {}

  /**
   * Encuentra todos los usuarios y selecciona campos específicos para no exponer datos sensibles.
   */
  async findAll(): Promise<OldUser[]> {
    // Usamos la opción 'select' para explícitamente pedir los campos que queremos.
    // Es una capa extra de seguridad para NUNCA devolver hashes de contraseñas.
    return this.oldUsersRepository.find({
      select: {
        id: true,
        username: true,
        email: true,
        activated: true,
        banned: true,
        last_login: true,
        created: true,
        modified: true,
      },
      relations: {
        permisos: true,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  // Aquí añadirías otros métodos como findOne, create, update, delete...
}
