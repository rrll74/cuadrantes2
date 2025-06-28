import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Permiso } from './permisos/entities/permiso.entity';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    @InjectRepository(User, 'new') private userRepository: Repository<User>,
    @InjectRepository(Permiso, 'new')
    private permisoRepository: Repository<Permiso>,
  ) {}

  async onModuleInit() {
    await this.seedPermissions();
    await this.seedAdminUser();
  }

  async seedPermissions() {
    const existingPermisos = await this.permisoRepository.count();
    if (existingPermisos > 0) return;

    const permisosData = [
      { tipo: 'users:create', descripcion: 'Crear usuarios' },
      { tipo: 'users:read', descripcion: 'Leer usuarios' },
      { tipo: 'users:update', descripcion: 'Actualizar usuarios' },
      { tipo: 'users:delete', descripcion: 'Eliminar usuarios' },
    ];
    const permisos = this.permisoRepository.create(permisosData);
    await this.permisoRepository.save(permisos);
    console.log('Permisos creados!');
  }

  async seedAdminUser() {
    const existingAdmin = await this.userRepository.findOne({
      where: { username: 'admin' },
    });
    if (existingAdmin) return;

    const allPermisos = await this.permisoRepository.find();

    const admin = this.userRepository.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'ChangeMe123!', // Contraseña inicial
      permisos: allPermisos,
    });
    await this.userRepository.save(admin);
    console.log('Usuario Admin creado!');
  }
}
