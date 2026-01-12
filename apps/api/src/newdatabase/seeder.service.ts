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
    const permisosData = [
      { tipo: 'admin', descripcion: 'Permisos de administrador' },
      { tipo: 'users:create', descripcion: 'Crear usuarios' },
      { tipo: 'users:read', descripcion: 'Leer usuarios' },
      { tipo: 'users:update', descripcion: 'Actualizar usuarios' },
      { tipo: 'users:delete', descripcion: 'Eliminar usuarios' },
      { tipo: 'jornadas:read', descripcion: 'Jornadas: Leer' },
      { tipo: 'jornadas:write', descripcion: 'Jornadas: Escribir' },
    ];

    for (const permisoData of permisosData) {
      const exists = await this.permisoRepository.findOne({
        where: { tipo: permisoData.tipo },
      });
      if (!exists) {
        await this.permisoRepository.save(
          this.permisoRepository.create(permisoData),
        );
        console.log(`Permiso creado: ${permisoData.tipo}`);
      }
    }
  }

  async seedAdminUser() {
    const existingAdmin = await this.userRepository.findOne({
      where: { username: 'admin' },
      relations: ['permisos'],
    });

    const allPermisos = await this.permisoRepository.find();

    if (existingAdmin) {
      const currentPermisosTypes = existingAdmin.permisos.map((p) => p.tipo);
      const newPermisos = allPermisos.filter(
        (p) => !currentPermisosTypes.includes(p.tipo),
      );

      if (newPermisos.length > 0) {
        existingAdmin.permisos = [...existingAdmin.permisos, ...newPermisos];
        await this.userRepository.save(existingAdmin);
        console.log('Usuario Admin actualizado con nuevos permisos!');
      }
      return;
    }

    console.log(
      'Permisos para el admin:',
      allPermisos.map((p) => p.tipo).join(', '),
    );

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
