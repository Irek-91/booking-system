import { Booking } from '../../domain/entities/booking.entity';
import { RestaurantId } from '../../domain/value-objects/restaurant-id.vo';
import { BookingDate } from '../../domain/value-objects/booking-date.vo';
import { BookingTime } from '../../domain/value-objects/booking-time.vo';
import { BookingDuration } from '../../domain/value-objects/booking-duration.enum';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface IBookingRepository {
  save(booking: Booking): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  findByRestaurantDateAndTimeRange(
    restaurantId: RestaurantId,
    date: BookingDate,
    startTime: BookingTime,
    duration: BookingDuration,
  ): Promise<Booking[]>;
}

