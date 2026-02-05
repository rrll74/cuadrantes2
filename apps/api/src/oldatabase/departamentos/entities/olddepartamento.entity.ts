import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'departamentos' }) // Mapea a la tabla 'departamentos' en la BD old
export class OldDepartamento {
  @ApiProperty({ description: 'ID del departamento' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nombre del departamento' })
  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @ApiProperty({ description: 'Descripción del departamento', required: false })
  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion?: string;

  @ApiProperty({
    description: 'Indicador de departamento activo',
    required: false,
  })
  @Column({ type: 'tinyint', width: 1, default: 1, nullable: true })
  activo?: boolean;
}
