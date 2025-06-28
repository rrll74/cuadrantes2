import {
  BeforeInsert,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @ManyToMany(() => Permiso, { eager: true }) // eager: true para que siempre cargue los permisos
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
  permisos: Permiso[];

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}
