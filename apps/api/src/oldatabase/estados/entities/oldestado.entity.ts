import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'estados' })
export class OldEstado {
  @ApiProperty({ description: 'ID del estado' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Abreviatura del estado' })
  @Column({ type: 'varchar', length: 4, unique: true })
  abreviatura: string;

  @ApiProperty({ description: 'Descripción del estado' })
  @Column({ type: 'varchar', length: 30, nullable: true })
  descrip: string;

  @ApiProperty({ description: 'Trabaja (1) o Descansa (0)' })
  @Column({ type: 'tinyint', width: 1 })
  trab1_desc0: boolean;

  @ApiProperty({ description: 'Color de texto (valor numérico)' })
  @Column({ type: 'int' })
  colortexto: number;

  @ApiProperty({ description: 'Color de fondo (valor numérico)' })
  @Column({ type: 'int' })
  colorfondo: number;

  @ApiProperty({ description: 'Hora de inicio' })
  @Column({ type: 'time', nullable: true })
  horainicio: string;

  @ApiProperty({ description: 'Hora de fin' })
  @Column({ type: 'time', nullable: true })
  horafin: string;

  @ApiProperty({ description: 'Visible' })
  @Column({ type: 'tinyint', width: 1, default: true, nullable: true })
  visible: boolean;
}
