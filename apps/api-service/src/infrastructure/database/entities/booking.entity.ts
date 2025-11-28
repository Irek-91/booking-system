import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../../../domain/entities/booking-status.enum';
import { BookingDuration } from '../../../domain/value-objects/booking-duration.enum';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'restaurant_id' })
  restaurantId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  time: string;

  @Column({ type: 'integer' })
  guests: number;

  @Column({
    type: 'integer',
    name: 'duration',
    default: BookingDuration.ONE_HOUR,
  })
  duration: BookingDuration;

  @Column({ type: 'uuid', name: 'table_id', nullable: true })
  tableId: string | null;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.CREATED,
  })
  status: BookingStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

