import { Permiso } from "./permiso";

export interface User {
  id: number;
  username: string;
  email: string;
  activated: boolean;
  banned: boolean;
  last_login: string; // Las fechas suelen llegar como strings en JSON
  created: string;
  modified: string;
  permisos: Permiso[];
}
