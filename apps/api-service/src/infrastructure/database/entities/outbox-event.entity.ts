import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum OutboxEventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Entity('outbox_events')
@Index(['status', 'createdAt'])
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb', name: 'payload' })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: OutboxEventStatus,
    default: OutboxEventStatus.PENDING,
    name: 'status',
  })
  status: OutboxEventStatus;

  @Column({ type: 'integer', name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

