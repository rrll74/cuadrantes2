import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSelfUserDto {
  @ApiProperty({ description: 'Email del usuario', example: 'user@test.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Contraseña actual del usuario' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({ description: 'Nueva contraseña del usuario', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  newPassword?: string;
}
