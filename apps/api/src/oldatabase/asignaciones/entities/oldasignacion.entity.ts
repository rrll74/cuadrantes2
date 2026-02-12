import { ApiProperty } from '@nestjs/swagger';
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity({ name: 'asignaciones' })
@Index('ind_asignaciones', [
  'ini0_mod1',
  'cuadrante_id',
  'empleado_id',
  'fecha',
])
@Index('ind_estados', ['ini0_mod1', 'estado_id'])
export class OldAsignacion {
  @ApiProperty({ description: 'ID de la asignación' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Fecha de la asignación' })
  @Column({ type: 'date' })
  fecha: Date;

  @ApiProperty({ description: 'Tipo: inicial (0) o modificado (1)' })
  @Column({ type: 'tinyint', width: 1, nullable: true })
  ini0_mod1: boolean;

  @ApiProperty({ description: 'ID del empleado' })
  @Column({ type: 'int' })
  empleado_id: number;

  @ApiProperty({ description: 'ID del cuadrante' })
  @Column({ type: 'int' })
  cuadrante_id: number;

  @ApiProperty({ description: 'ID del estado' })
  @Column({ type: 'int' })
  estado_id: number;

  @ApiProperty({ description: 'Observaciones' })
  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @ApiProperty({ description: 'Vínculo' })
  @Column({ type: 'varchar', length: 70, nullable: true })
  vinculo: string;

  @ApiProperty({ description: 'Incidencia' })
  @Column({ type: 'varchar', length: 150, nullable: true })
  incidencia: string;

  @ApiProperty({ description: 'Hora de inicio' })
  @Column({ type: 'time', nullable: true })
  horaini: string;

  @ApiProperty({ description: 'Hora de fin' })
  @Column({ type: 'time', nullable: true })
  horafin: string;

  @ApiProperty({ description: 'Cronos inicio' })
  @Column({ type: 'time', nullable: true })
  cronosini: string;

  @ApiProperty({ description: 'Cronos fin' })
  @Column({ type: 'time', nullable: true })
  cronosfin: string;

  @ApiProperty({ description: 'Cronos resuelto' })
  @Column({ type: 'tinyint', width: 1, nullable: true })
  cronossolved: boolean;

  @ApiProperty({ description: 'Cronos info' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  cronosinfo: string;

  @ApiProperty({ description: 'Cronos info horas' })
  @Column({ type: 'time', nullable: true })
  cronosinfohoras: string;

  @ApiProperty({ description: 'Cronos observaciones' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  cronosobs: string;

  @ApiProperty({ description: 'Cronos inicio modificado' })
  @Column({ type: 'time', nullable: true })
  cronosinimod: string;

  @ApiProperty({ description: 'Cronos fin modificado' })
  @Column({ type: 'time', nullable: true })
  cronosfinmod: string;
}
