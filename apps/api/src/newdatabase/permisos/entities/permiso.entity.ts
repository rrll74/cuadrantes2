import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '@/newdatabase/users/entities/user.entity';

@Entity({ name: 'permisos' })
export class Permiso {
  @ApiProperty({ example: 1, description: 'ID único del permiso' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 'users:read',
    description: 'El identificador único del permiso (string)',
  })
  @Column({ type: 'varchar', length: 30 })
  tipo: string;

  @ApiProperty({ example: 'Leer usuarios', description: 'Descripción legible' })
  @Column({ type: 'varchar', length: 50 })
  descripcion: string;

  @ApiProperty({
    description: 'Indica si el permiso es solo para super-admins',
  })
  @Column({ type: 'tinyint', width: 1, default: false })
  restringido: boolean;

  // Definimos el lado inverso de la relación muchos a muchos.
  // Esto es opcional pero útil si alguna vez necesitas buscar usuarios desde un permiso.
  @ManyToMany(() => User, (user) => user.permisos)
  users: User[];
}
