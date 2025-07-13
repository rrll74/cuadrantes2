import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User, 'new')
    private usersRepository: Repository<User>,
    @InjectRepository(Permiso, 'new')
    private permisosRepository: Repository<Permiso>,
  ) {}

  async findOneByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username } });
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { permisoIds, ...userData } = createUserDto;
    let permisos: Permiso[] = [];
    if (permisoIds && permisoIds.length === 0) {
      permisos = await this.permisosRepository.findBy({
        id: In(permisoIds),
      });
    }

    const newUser = this.usersRepository.create({
      ...userData,
      permisos,
    });

    return this.usersRepository.save(newUser);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const { permisoIds, ...userData } = updateUserDto;
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (permisoIds) {
      user.permisos = await this.permisosRepository.findBy({
        id: In(permisoIds),
      });
    }

    // Si se envía una nueva contraseña, la hasheamos antes de guardar
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    Object.assign(user, userData);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
  }
}
