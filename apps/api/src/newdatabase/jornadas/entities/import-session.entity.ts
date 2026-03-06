import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { ScheduledRoute } from './scheduled-route.entity';
import { RawWorker } from './raw-worker.entity';
import { RawClockIn } from './raw-clock-in.entity';
import { PresenceResult } from './presence-result.entity';

@Entity('import_sessions')
export class ImportSession {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  userId: number; // ID del usuario que realizó la carga (opcional por ahora)

  @Column({ default: 1 })
  importType: number; // 1: Tipo primario (Titulares + Auxiliares), 2: Tipo secundario (Rutas unificadas)

  @OneToMany(() => ScheduledRoute, (route) => route.session)
  routes: ScheduledRoute[];

  @OneToMany(() => RawWorker, (worker) => worker.session)
  workers: RawWorker[];

  @OneToMany(() => RawClockIn, (clockIn) => clockIn.session)
  clockIns: RawClockIn[];

  @OneToMany(() => PresenceResult, (result) => result.session)
  results: PresenceResult[];

  @Column({ default: false })
  isHighSeason: boolean;

  @Column({ type: 'int', default: 0 })
  daysMonFri: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shiftsMonFri: number;

  @Column({ type: 'int', default: 0 })
  daysSatSunHol: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shiftsSatSunHol: number;

  @Column({ type: 'text', nullable: true })
  discountServices: string;

  @Column({ type: 'text', nullable: true })
  discountTeams: string;
}
