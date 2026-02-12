import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'empleados' })
export class OldEmpleado {
  @ApiProperty({ description: 'ID del empleado' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'NIF del empleado' })
  @Column({ type: 'varchar', length: 10, unique: true })
  nif: string;

  @ApiProperty({ description: 'Nombre del empleado' })
  @Column({ type: 'varchar', length: 50, unique: true })
  nombre: string;

  @ApiProperty({ description: 'Dirección del empleado' })
  @Column({ type: 'varchar', length: 150, nullable: true })
  direccion: string;

  @ApiProperty({ description: 'Teléfonos del empleado' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  tlfnos: string;

  @ApiProperty({ description: 'Código postal' })
  @Column({ type: 'varchar', length: 5, nullable: true })
  codpostal: string;

  @ApiProperty({ description: 'Población' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  poblacion: string;

  @ApiProperty({ description: 'Provincia' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  provincia: string;

  @ApiProperty({ description: 'Fecha de nacimiento' })
  @Column({ type: 'date', nullable: true })
  nacimiento: Date;

  @ApiProperty({ description: 'ID estado civil' })
  @Column({ type: 'int', nullable: true })
  estcivil_id: number;

  @ApiProperty({ description: 'Número de hijos' })
  @Column({ type: 'int', nullable: true })
  hijos: number;

  @ApiProperty({ description: 'Número de afiliación a la seguridad social' })
  @Column({ type: 'varchar', length: 15, nullable: true })
  nass: string;

  @ApiProperty({ description: 'Número de tarjeta' })
  @Column({ type: 'int', nullable: true })
  tarjeta: number;

  @ApiProperty({ description: 'Observaciones' })
  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @ApiProperty({ description: 'Indica si el empleado está activo' })
  @Column({ type: 'tinyint', width: 1, default: true })
  activo: boolean;

  @ApiProperty({ description: 'Email del empleado' })
  @Column({ type: 'varchar', length: 128, nullable: true })
  email: string;

  @ApiProperty({ description: 'Grupo del empleado' })
  @Column({
    type: 'enum',
    enum: ['AP', 'C2', 'C1', 'B', 'A2', 'A1'],
    nullable: true,
    default: 'AP',
  })
  grupo: string;

  @ApiProperty({ description: 'Fecha de antigüedad' })
  @Column({ type: 'date', nullable: true })
  antiguedad: Date;

  @ApiProperty({ description: 'Siglas del empleado' })
  @Column({ type: 'varchar', length: 6, nullable: true })
  siglas: string;
}
