import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImportSession } from './import-session.entity';
import { EstadoPresencia } from './presence-result.entity';

@Entity('unmatched_results')
export class UnmatchedResult {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ImportSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ImportSession;

  @Column({ name: 'worker_id' })
  workerId: number;

  @Column({ type: 'date' })
  fecha: Date;

  @Column({ name: 'fichaje_entrada', type: 'datetime', nullable: true })
  fichajeEntrada: Date | null;

  @Column({ name: 'fichaje_salida', type: 'datetime', nullable: true })
  fichajeSalida: Date | null;

  @Column({
    type: 'simple-enum',
    enum: EstadoPresencia,
    default: EstadoPresencia.SIN_PRESENCIA,
  })
  estado: EstadoPresencia;
}
