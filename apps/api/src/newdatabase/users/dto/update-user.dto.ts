import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  IsNumber,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nombre de usuario único',
    example: 'nuevo_usuario',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'Email del usuario', example: 'user@test.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Contraseña del usuario', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @ApiProperty({
    description: 'Array de IDs de los permisos a asignar',
    example: [1, 2],
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  permisos?: number[] | undefined;
}
