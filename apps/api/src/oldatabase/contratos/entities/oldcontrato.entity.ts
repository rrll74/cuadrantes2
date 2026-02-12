import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'contratos' })
export class OldContrato {
  @ApiProperty({ description: 'ID del contrato' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Fecha de comienzo' })
  @Column({ type: 'date', nullable: true })
  comienzo: Date;

  @ApiProperty({ description: 'Fecha de fin' })
  @Column({ type: 'date', nullable: true })
  fin: Date;

  @ApiProperty({ description: 'Fijeza del contrato' })
  @Column({ type: 'tinyint', width: 1 })
  fijeza: boolean;

  @ApiProperty({ description: 'Observaciones' })
  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @ApiProperty({ description: 'ID del tipo de contrato' })
  @Column({ type: 'int' })
  tipocontrato_id: number;

  @ApiProperty({ description: 'ID del empleado' })
  @Column({ type: 'int' })
  empleado_id: number;
}
