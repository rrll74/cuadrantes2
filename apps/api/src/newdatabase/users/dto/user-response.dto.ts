import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  id: number;
  username: string;
  email: string;
  //   activated: boolean;
  //   banned: boolean;
  //   last_login: Date;
  //   created: Date;
  //   modified: Date;
  permisos: Permiso[];
  isConnected: boolean;

  constructor(user: User, isConnected: boolean) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.permisos = user.permisos;
    this.isConnected = isConnected;
  }
}
