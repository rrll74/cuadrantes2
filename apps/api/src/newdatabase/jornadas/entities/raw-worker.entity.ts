import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImportSession } from './import-session.entity';

@Entity('raw_workers')
export class RawWorker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => ImportSession, (session) => session.workers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: ImportSession;

  @Column()
  excelId: number; // ID original del excel ("Código")

  @Column()
  nombre: string;

  @Column()
  apellido1: string;

  @Column({ default: '' })
  apellido2: string;

  @Column({ default: '' })
  puesto: string;

  @Column({ default: 0 })
  equal: number;
}
