import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'puestos' })
export class OldPuesto {
  @ApiProperty({ description: 'ID del puesto' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Fecha de comienzo' })
  @Column({ type: 'date' })
  comienzo_c: Date;

  @ApiProperty({ description: 'Fecha de fin' })
  @Column({ type: 'date', nullable: true })
  fin_c: Date;

  @ApiProperty({ description: 'Hasta el fin' })
  @Column({ type: 'tinyint', width: 1 })
  hastafin: boolean;

  @ApiProperty({ description: 'ID de la categoría' })
  @Column({ type: 'int' })
  categoria_id: number;

  @ApiProperty({ description: 'ID del departamento' })
  @Column({ type: 'int' })
  departamento_id: number;

  @ApiProperty({ description: 'ID del contrato' })
  @Column({ type: 'int' })
  contrato_id: number;
}
