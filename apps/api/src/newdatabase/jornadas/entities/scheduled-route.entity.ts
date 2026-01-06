import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ImportSession } from './import-session.entity';

@Entity('scheduled_routes')
export class ScheduledRoute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => ImportSession, (session) => session.routes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: ImportSession;

  @Column({ type: 'datetime' })
  fechaGeneral: Date;

  @Column()
  codigoParte: string;

  @Column()
  servicio: string;

  @Column()
  turno: string;

  @Column()
  equipo: string;

  @Column({ type: 'datetime' })
  inicio: Date;

  @Column({ type: 'datetime' })
  fin: Date;

  @Column()
  workerId: number; // ID extraído del excel

  @Column()
  vehiculo: string;

  @Column('float')
  kms: number;

  @Column({ default: false })
  esTitular: boolean; // true = Titulares, false = Auxiliares

  @Column({ default: 0 })
  partesAsociados: number;
}
