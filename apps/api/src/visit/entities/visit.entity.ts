import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Store } from '../../store/entities/store.entity';

export enum VisitStatus {
  OPEN = 'open',
  COMPLETED = 'completed',
}

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @Column({ type: 'timestamp' })
  checkin_time: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkin_lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkin_lng: number;

  @Column({ type: 'timestamp', nullable: true })
  checkout_time: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkout_lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  checkout_lng: number;

  @Column({ type: 'enum', enum: VisitStatus, default: VisitStatus.OPEN })
  status: VisitStatus;
}
