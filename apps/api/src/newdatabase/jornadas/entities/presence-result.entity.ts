import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { ImportSession } from './import-session.entity';
import { ScheduledRoute } from './scheduled-route.entity';

export enum EstadoPresencia {
  COMPLETO = 'completo',
  INCOMPLETO = 'incompleto',
  SIN_PRESENCIA = 'sin presencia',
}

@Entity('presence_results')
export class PresenceResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => ImportSession, (session) => session.results, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: ImportSession;

  @Column()
  routeId: number;

  @OneToOne(() => ScheduledRoute)
  @JoinColumn({ name: 'routeId' })
  route: ScheduledRoute;

  @Column({ type: 'datetime', nullable: true })
  fichajeEntrada: Date | null;

  @Column({ type: 'datetime', nullable: true })
  fichajeSalida: Date | null;

  @Column({ type: 'varchar' })
  estado: EstadoPresencia;

  @Column({ default: false })
  esDuplicado: boolean;

  @Column({ default: false })
  revisar: boolean;
}
