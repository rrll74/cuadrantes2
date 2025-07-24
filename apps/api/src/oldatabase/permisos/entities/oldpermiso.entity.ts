import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { OldUser } from '@/oldatabase/users/entities/olduser.entity';

@Entity({ name: 'permisos' }) // Mapea la table 'permisos'
export class OldPermiso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  tipo: string;

  @Column({ type: 'varchar', length: 50 })
  descripcion: string;

  @Column({ type: 'tinyint', width: 1, default: false })
  restringido: boolean;

  // Definimos el lado inverso de la relación muchos a muchos.
  // Esto es opcional pero útil si alguna vez necesitas buscar usuarios desde un permiso.
  @ManyToMany(() => OldUser, (user) => user.permisos)
  users: OldUser[];
}
