import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { Booking } from '../../../domain/entities/booking.entity';
import {
  IBookingRepository,
} from '../../../application/interfaces/booking.repository.interface';

@Injectable()
export class BookingRepository implements IBookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly repository: Repository<BookingEntity>,
  ) {}

  async save(booking: Booking): Promise<Booking> {
    const entity = this.toEntity(booking);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Booking | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  private toEntity(booking: Booking): BookingEntity {
    const entity = new BookingEntity();
    entity.id = booking.getId();
    entity.restaurantId = booking.getRestaurantId().toString();
    entity.date = booking.getDate().toDate();
    entity.time = booking.getTime().toString();
    entity.guests = booking.getGuests().toNumber();
    entity.duration = booking.getDuration();
    entity.tableId = booking.getTableId();
    entity.status = booking.getStatus();
    entity.createdAt = booking.getCreatedAt();
    entity.updatedAt = booking.getUpdatedAt();
    return entity;
  }

  private toDomain(entity: BookingEntity): Booking {
    return Booking.fromPersistence(
      entity.id,
      entity.restaurantId,
      entity.date,
      entity.time,
      entity.guests,
      entity.duration,
      entity.tableId || null,
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

