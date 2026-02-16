import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSelfUserDto } from './dto/update-self-user.dto';
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

  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.usersRepository.find({
      relations: ['permisos'],
      order: { id: 'ASC' },
    });

    // Mapeamos cada usuario para añadir el estado de conexión y quitar la contraseña
    return users.map((user: User) => {
      return this.buildUserResponse(user);
    });
  }

  async getSelfUser(userId: number): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['permisos'],
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    return this.buildUserResponse(user);
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

  async updateSelfUser(
    userId: number,
    updateSelfUserDto: UpdateSelfUserDto,
  ): Promise<UserResponseDto> {
    const { email, currentPassword, newPassword } = updateSelfUserDto;

    if (!email && !newPassword) {
      throw new BadRequestException('No hay datos para actualizar.');
    }

    if (!currentPassword) {
      throw new BadRequestException(
        'Debes proporcionar tu contraseña actual para actualizar tus datos.',
      );
    }

    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.permisos', 'permiso')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password || '',
    );

    if (!isCurrentPasswordValid) {
      throw new ForbiddenException('La contraseña actual no es correcta.');
    }

    if (email && email !== user.email) {
      const existingEmailUser = await this.usersRepository.findOne({
        where: { email },
      });

      if (existingEmailUser && existingEmailUser.id !== userId) {
        throw new BadRequestException('El email ya está en uso.');
      }

      user.email = email;
    }

    if (newPassword) {
      user.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await this.usersRepository.save(user);
    return this.buildUserResponse(updatedUser);
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
  }

  private buildUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      permisos: user.permisos,
      isConnected: this.connectionStatusService.isUserConnected(user.id),
    };
  }
}
