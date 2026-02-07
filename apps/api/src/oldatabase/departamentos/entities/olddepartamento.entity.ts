import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'departamentos' }) // Mapea a la tabla 'departamentos' en la BD old
export class OldDepartamento {
  @ApiProperty({ description: 'ID del departamento' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nombre del departamento' })
  @Column({ type: 'varchar', length: 30 })
  nombre: string;
}
