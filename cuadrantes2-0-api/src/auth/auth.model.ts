import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';

export interface AuthModel {
  sub: number;
  username: string;
  permisos: string[];
}

export interface LoginModel {
  id: number;
  username: string;
  permisos: Permiso[];
}

export interface UserPayload {
  userId: number;
  username: string;
  permisos: string[];
}
