import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../entities/booking.entity';
import { Booking } from '../../../domain/entities/booking.entity';
import { BookingStatus } from '../../../domain/entities/booking-status.enum';
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

  async findByRestaurantDateAndTimeRange(
    restaurantId: string,
    date: Date,
    startTime: string,
    duration: number,
    tableId?: string | null,
  ): Promise<Booking[]> {
    // Нормализуем дату для сравнения (убираем время)
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Вычисляем время окончания
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDateTime = new Date(normalizedDate);
    startDateTime.setHours(hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + duration);

    // Находим все брони для этого ресторана и даты
    // Если указан tableId, фильтруем только брони для этого стола
    const whereCondition: any = {
      restaurantId,
      date: normalizedDate,
      status: BookingStatus.CONFIRMED, // Только подтвержденные брони
    };

    if (tableId) {
      whereCondition.tableId = tableId;
    }

    const entities = await this.repository.find({
      where: whereCondition,
    });

    // Фильтруем брони, которые пересекаются с заданным временным интервалом
    const conflictingBookings = entities.filter((entity) => {
      const [entityHours, entityMinutes] = entity.time.split(':').map(Number);
      const entityStart = new Date(normalizedDate);
      entityStart.setHours(entityHours, entityMinutes, 0, 0);
      const entityEnd = new Date(entityStart);
      entityEnd.setHours(entityEnd.getHours() + entity.duration);

      // Проверяем пересечение: start < otherEnd && otherStart < end
      return startDateTime < entityEnd && entityStart < endDateTime;
    });

    return conflictingBookings.map((entity) => this.toDomain(entity));
  }

  private toEntity(booking: Booking): BookingEntity {
    const entity = new BookingEntity();
    entity.id = booking.getId();
    entity.restaurantId = booking.getRestaurantId();
    entity.date = booking.getDate();
    entity.time = booking.getTime();
    entity.guests = booking.getGuests();
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

