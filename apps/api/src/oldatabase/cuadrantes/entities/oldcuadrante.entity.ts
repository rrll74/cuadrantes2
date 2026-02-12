import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'cuadrantes' })
export class OldCuadrante {
  @ApiProperty({ description: 'ID del cuadrante' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nombre del cuadrante' })
  @Column({ type: 'varchar', length: 30, unique: true })
  nombre: string;

  @ApiProperty({ description: 'ID del departamento' })
  @Column({ type: 'int', nullable: true })
  departamento_id: number;

  @ApiProperty({ description: 'Año del cuadrante' })
  @Column({ type: 'int', nullable: true })
  anio: number;

  @ApiProperty({ description: 'Inicio turno 2 día 1 turno' })
  @Column({ type: 'int', nullable: true })
  initurno2d1t: number;

  @ApiProperty({ description: 'Inicio turno 3 día 1 turno' })
  @Column({ type: 'int', nullable: true })
  initurno3d1t: number;

  @ApiProperty({ description: 'Inicio turno 2 día 1 turno (3)' })
  @Column({ type: 'int', nullable: true })
  initurno2d1t_3: number;

  @ApiProperty({ description: 'Visible' })
  @Column({ type: 'tinyint', width: 1, default: true, nullable: true })
  visible: boolean;

  @ApiProperty({ description: 'Es guardia' })
  @Column({ type: 'tinyint', width: 1, default: true, nullable: true })
  guardia: boolean;
}
