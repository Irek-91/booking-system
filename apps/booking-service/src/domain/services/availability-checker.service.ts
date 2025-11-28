import { Injectable, Inject } from '@nestjs/common';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../entities/booking-status.enum';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../application/interfaces/booking.repository.interface';

@Injectable()
export class AvailabilityCheckerService {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async checkAvailability(booking: Booking): Promise<BookingStatus> {
    // Если у брони есть tableId, проверяем конфликты только для этого стола
    // Если tableId нет, проверяем все столы ресторана
    const conflictingBookings = await this.bookingRepository.findByRestaurantDateAndTimeRange(
      booking.getRestaurantId(),
      booking.getDate(),
      booking.getTime(),
      booking.getDuration(),
      booking.getTableId(), // Передаем tableId для фильтрации
    );

    // Если найдены конфликтующие брони (и это не та же самая бронь)
    const hasConflict = conflictingBookings.some(
      (conflictingBooking) => conflictingBooking.getId() !== booking.getId(),
    );

    if (hasConflict) {
      return BookingStatus.REJECTED;
    }

    return BookingStatus.CONFIRMED;
  }
}

