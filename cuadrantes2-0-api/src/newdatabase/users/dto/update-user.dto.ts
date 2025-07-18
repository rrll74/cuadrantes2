import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  IsInt,
  IsNumber,
} from 'class-validator';

export class UpdateUserDto {
  @IsNumber()
  id: number;

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
  permisos?: number[];
}
