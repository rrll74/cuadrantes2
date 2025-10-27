import { ApiProperty } from '@nestjs/swagger';
import { Permiso } from '@/newdatabase/permisos/entities/permiso.entity';
import { User } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'El ID único del usuario' })
  id: number;

  @ApiProperty({
    example: 'testuser',
    description: 'El nombre de usuario para el inicio de sesión',
  })
  username: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'La dirección de correo electrónico del usuario',
  })
  email: string;
  //   activated: boolean;
  //   banned: boolean;
  //   last_login: Date;
  //   created: Date;
  //   modified: Date;
  permisos: Permiso[];

  @ApiProperty({
    description: 'Indica si el usuario está conectado vía WebSocket',
  })
  isConnected: boolean;

  constructor(user: User, isConnected: boolean) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.permisos = user.permisos;
    this.isConnected = isConnected;
  }
}
