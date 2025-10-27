import { ApiProperty } from '@nestjs/swagger';
import { OldUser } from '@/oldatabase/users/entities/olduser.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';

@Entity({ name: 'permisos' }) // Mapea la table 'permisos'
export class OldPermiso {
  @ApiProperty({ description: 'ID del permiso' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nombre del permiso' })
  @Column()
  tipo: string;

  @ApiProperty({ description: 'Descripción del permiso' })
  @Column({ type: 'varchar', length: 50 })
  descripcion: string;

  @ApiProperty({
    example: true,
    description: 'Indica si el permiso es restringido',
  })
  @Column({ type: 'tinyint', width: 1, default: false })
  restringido: boolean;

  // Definimos el lado inverso de la relación muchos a muchos.
  // Esto es opcional pero útil si alguna vez necesitas buscar usuarios desde un permiso.
  @ManyToMany(() => OldUser, (user) => user.permisos)
  users: OldUser[];
}
