import { ApiProperty } from '@nestjs/swagger';
import { OldPermiso } from '@/oldatabase/permisos/entities/oldpermiso.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  //   CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';

@Entity({ name: 'users' }) // Mapea a la tabla 'users'
export class OldUser {
  @ApiProperty({ description: 'ID del usuario' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nombre del usuario' })
  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @ApiProperty({ description: 'Contraseña del usuario' })
  // IMPORTANTE: Nunca expondremos este campo en la API.
  @Column({ type: 'varchar', length: 255, select: false }) // 'select: false' evita que se obtenga por defecto
  password: string;

  @ApiProperty({ description: 'Email del usuario' })
  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @ApiProperty({ description: 'Indica si el usuario está activo' })
  @Column({ type: 'tinyint', width: 1, default: 1 })
  activated: boolean;

  @ApiProperty({ description: 'Indica si el usuario está baneado' })
  @Column({ type: 'tinyint', width: 1, default: 0 })
  banned: boolean;

  @ApiProperty({ description: 'Motivo del ban' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  ban_reason: string;

  // Omitimos los campos de reseteo de contraseña/email por simplicidad en este ejemplo
  // pero se añadirían como @Column si fueran necesarios.
  // new_password_key, new_password_requested, new_email, new_email_key...

  @ApiProperty({ description: 'Dirección IP del último inicio de sesión' })
  @Column({ type: 'varchar', length: 40 })
  last_ip: string;

  @ApiProperty({ description: 'Fecha y hora del último inicio de sesión' })
  @Column({ type: 'datetime', default: '0000-00-00 00:00:00' })
  last_login: Date;

  // TypeORM puede gestionar automáticamente las fechas de creación y modificación
  // Si la tabla ya lo hace, esto se alinea perfectamente.
  @ApiProperty({ description: 'Fecha y hora de creación del usuario' })
  @Column({ type: 'datetime', default: '0000-00-00 00:00:00' })
  created: Date;

  @ApiProperty({ description: 'Fecha y hora de modificación del usuario' })
  @UpdateDateColumn() // Gestiona automáticamente la columna `modified`
  modified: Date;

  // Definición de la relación Muchos a Muchos
  @ManyToMany(() => OldPermiso, (permiso) => permiso.users, { eager: false }) // eager: false es mejor para el rendimiento, los cargaremos cuando los necesitemos
  @JoinTable({
    name: 'permisos_users', // El nombre de tu tabla intermedia
    joinColumn: {
      // Configuración de la clave foránea que apunta a esta entidad (User)
      name: 'usuario_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      // Configuración de la clave foránea que apunta a la otra entidad (Permiso)
      name: 'permiso_id',
      referencedColumnName: 'id',
    },
  })
  permisos: OldPermiso[];
}
