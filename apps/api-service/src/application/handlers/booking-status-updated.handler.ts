import { Injectable, Inject } from '@nestjs/common';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../interfaces/booking.repository.interface';
import {
  BookingStatusUpdatedEvent,
} from '@booking-system/shared';
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service';

@Injectable()
export class BookingStatusUpdatedHandler {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: BookingStatusUpdatedEvent): Promise<void> {
    const correlationId = event.correlationId || 'unknown';

    this.logger.logKafkaEvent('info', 'Processing booking.status.updated event', {
      eventType: 'booking.status.updated',
      bookingId: event.bookingId,
      status: event.status,
      correlationId,
    });

    try {
      const booking = await this.bookingRepository.findById(event.bookingId);

      if (!booking) {
        this.logger.logBooking('warn', 'Booking not found, skipping status update', {
          bookingId: event.bookingId,
          correlationId,
          status: event.status,
        });
        return;
      }

      // Обновляем статус брони
      booking.updateStatus(event.status);
      await this.bookingRepository.save(booking);

      this.logger.logBooking('info', 'Booking status updated successfully', {
        bookingId: event.bookingId,
        correlationId,
        status: event.status,
      });
    } catch (error) {
      this.logger.logBooking('error', 'Failed to process booking.status.updated event', {
        bookingId: event.bookingId,
        correlationId,
        status: event.status,
        error: error.message,
      });
      throw error;
    }
  }
}

