import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';

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
}
