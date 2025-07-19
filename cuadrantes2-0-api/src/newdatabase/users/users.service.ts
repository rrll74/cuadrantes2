import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConnectionStatusService } from '@/status/connection-status.service';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User, 'new')
    private usersRepository: Repository<User>,
    private readonly connectionStatusService: ConnectionStatusService,
    @InjectRepository(Permiso, 'new')
    private permisosRepository: Repository<Permiso>,
  ) {}

  async findOneByUsername(username: string): Promise<User | null> {
    // Usamos QueryBuilder para seleccionar explícitamente la contraseña,
    // que por defecto no se incluye debido a { select: false } en la entidad.
    return this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.permisos', 'permiso') // Unimos y seleccionamos la relación de permisos
      .addSelect('user.password')
      .where('user.username = :username', { username })
      .getOne();
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({
      relations: ['permisos'],
      order: { id: 'ASC' },
    });

    // Mapeamos cada usuario para añadir el estado de conexión y quitar la contraseña
    return users.map((user: User) => {
      // Creamos explícitamente el DTO para asegurar que todas las propiedades se incluyan.
      // Esto evita problemas de inferencia de tipos con la desestructuración.
      const userResponse: UserResponseDto = {
        id: user.id,
        username: user.username,
        email: user.email,
        permisos: user.permisos,
        isConnected: this.connectionStatusService.isUserConnected(user.id),
      };
      return userResponse;
    });
  }

  // async findAll(): Promise<User[]> {
  //   return this.usersRepository.find();
  // }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { permisos, ...userData } = createUserDto;
    let permissions: Permiso[] = [];
    if (permisos && permisos.length > 0) {
      permissions = await this.permisosRepository.findBy({
        id: In(permisos),
      });
    }

    const newUser = this.usersRepository.create({
      ...userData,
      permisos: permissions,
    });

    return this.usersRepository.save(newUser);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const { permisos, ...userData } = updateUserDto;
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (permisos) {
      user.permisos = await this.permisosRepository.findBy({
        id: In(permisos),
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
