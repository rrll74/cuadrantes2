import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  IsInt,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  permisoIds?: number[];
}
