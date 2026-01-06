import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImportSession } from './import-session.entity';

export enum TipoFichaje {
  ENTRADA = 'Entrada',
  SALIDA = 'Salida',
}

@Entity('raw_clock_ins')
export class RawClockIn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => ImportSession, (session) => session.clockIns, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: ImportSession;

  @Column()
  workerId: number;

  @Column({ type: 'datetime' })
  timestamp: Date;

  @Column({ type: 'varchar' })
  tipo: TipoFichaje;
}
