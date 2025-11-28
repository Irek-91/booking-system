import { Booking } from '../../domain/entities/booking.entity';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface IBookingRepository {
  save(booking: Booking): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
}

