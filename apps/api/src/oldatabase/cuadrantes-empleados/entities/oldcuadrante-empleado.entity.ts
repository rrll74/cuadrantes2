import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'cuadrantes_empleados' })
export class OldCuadranteEmpleado {
  @ApiProperty({ description: 'ID del registro' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID del cuadrante' })
  @Column({ type: 'int' })
  cuadrante_id: number;

  @ApiProperty({ description: 'ID del empleado' })
  @Column({ type: 'int' })
  empleado_id: number;

  @ApiProperty({ description: 'Posición' })
  @Column({ type: 'int', nullable: true })
  posicion: number;

  @ApiProperty({ description: 'Tipo de turno' })
  @Column({ type: 'int', nullable: true })
  tipoturno: number;

  @ApiProperty({ description: 'Subturno' })
  @Column({ type: 'int', nullable: true })
  subturno: number;

  @ApiProperty({ description: 'Visible' })
  @Column({ type: 'tinyint', width: 1, default: true })
  visible: boolean;

  @ApiProperty({ description: 'Estado T' })
  @Column({ type: 'int', default: 1 })
  estadoT: number;

  @ApiProperty({ description: 'Estado FST' })
  @Column({ type: 'int' })
  estadoFST: number;

  @ApiProperty({ description: 'Estado TN' })
  @Column({ type: 'int' })
  estadoTN: number;

  @ApiProperty({ description: 'Estado FSTN' })
  @Column({ type: 'int' })
  estadoFSTN: number;
}
