import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableEntity } from '../entities/table.entity';
import { Table } from '../../../domain/entities/table.entity';
import {
  ITableRepository,
} from '../../../application/interfaces/table.repository.interface';
import { BookingStatus } from '../../../domain/entities/booking-status.enum';

@Injectable()
export class TableRepository implements ITableRepository {
  constructor(
    @InjectRepository(TableEntity)
    private readonly repository: Repository<TableEntity>,
  ) {}

  async findByRestaurant(restaurantId: string): Promise<Table[]> {
    const entities = await this.repository.find({
      where: { restaurantId },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findById(id: string): Promise<Table | null> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    return this.toDomain(entity);
  }

  async findAvailableTables(
    restaurantId: string,
    date: Date,
    startTime: string,
    duration: number,
    minCapacity: number,
    excludeBookingId?: string,
  ): Promise<Table[]> {
    // Нормализуем дату для сравнения
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Вычисляем временной интервал
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDateTime = new Date(normalizedDate);
    startDateTime.setHours(hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + duration);

    // Получаем все столы ресторана с достаточной вместимостью
    const allTables = await this.repository.find({
      where: {
        restaurantId,
      },
    });

    const suitableTables = allTables.filter(
      (table) => table.capacity >= minCapacity,
    );

    // Получаем детали забронированных столов с временными интервалами
    const bookedTablesWithTime = await this.repository.manager
      .createQueryBuilder()
      .select('b.table_id', 'tableId')
      .addSelect('b.time', 'time')
      .addSelect('b.duration', 'duration')
      .from('bookings', 'b')
      .where('b.restaurant_id = :restaurantId', {
        restaurantId,
      })
      .andWhere('b.date = :date', { date: normalizedDate })
      .andWhere('b.status = :status', { status: BookingStatus.CONFIRMED })
      .andWhere('b.table_id IS NOT NULL');

    if (excludeBookingId) {
      bookedTablesWithTime.andWhere('b.id != :excludeBookingId', {
        excludeBookingId,
      });
    }

    const bookedTables = await bookedTablesWithTime.getRawMany();

    // Фильтруем столы, которые свободны на указанное время
    const availableTables = suitableTables.filter((table) => {
      // Проверяем, есть ли брони для этого стола на пересекающееся время
      const tableBookings = bookedTables.filter(
        (booking) => booking.tableId === table.id,
      );

      for (const booking of tableBookings) {
        const [bookingHours, bookingMinutes] = booking.time
          .split(':')
          .map(Number);
        const bookingStart = new Date(normalizedDate);
        bookingStart.setHours(bookingHours, bookingMinutes, 0, 0);
        const bookingEnd = new Date(bookingStart);
        bookingEnd.setHours(bookingEnd.getHours() + booking.duration);

        // Проверяем пересечение временных интервалов
        if (startDateTime < bookingEnd && bookingStart < endDateTime) {
          return false; // Стол занят на это время
        }
      }

      return true; // Стол свободен
    });

    return availableTables.map((entity) => this.toDomain(entity));
  }

  private toDomain(entity: TableEntity): Table {
    return Table.fromPersistence(entity.id, entity.restaurantId, entity.capacity);
  }
}

