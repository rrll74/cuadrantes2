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

  @OneToMany(() => ScheduledRoute, (route) => route.session)
  routes: ScheduledRoute[];

  @OneToMany(() => RawWorker, (worker) => worker.session)
  workers: RawWorker[];

  @OneToMany(() => RawClockIn, (clockIn) => clockIn.session)
  clockIns: RawClockIn[];

  @OneToMany(() => PresenceResult, (result) => result.session)
  results: PresenceResult[];
}
