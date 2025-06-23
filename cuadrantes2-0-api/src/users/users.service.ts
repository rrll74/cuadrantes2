import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Encuentra todos los usuarios y selecciona campos específicos para no exponer datos sensibles.
   */
  async findAll(): Promise<User[]> {
    // Usamos la opción 'select' para explícitamente pedir los campos que queremos.
    // Es una capa extra de seguridad para NUNCA devolver hashes de contraseñas.
    return this.usersRepository.find({
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
      order: {
        id: 'ASC',
      },
    });
  }

  // Aquí añadirías otros métodos como findOne, create, update, delete...
}
