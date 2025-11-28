import { Injectable, Inject } from '@nestjs/common';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingStatus } from '../../domain/entities/booking-status.enum';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../interfaces/booking.repository.interface';
import { AvailabilityCheckerService } from '../../domain/services/availability-checker.service';
import { KafkaProducerService } from '../../infrastructure/kafka/kafka-producer.service';
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service';
import { BookingDuration } from '../../domain/value-objects/booking-duration.enum';
import { BookingCreatedEvent } from '@booking-system/shared';

@Injectable()
export class BookingCreatedHandler {
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly availabilityChecker: AvailabilityCheckerService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async handle(event: BookingCreatedEvent): Promise<void> {
    const correlationId = event.correlationId || 'unknown';

    this.logger.logKafkaEvent('info', 'Processing booking.created event', {
      eventType: 'booking.created',
      bookingId: event.bookingId,
      correlationId,
      restaurantId: event.restaurantId,
    });

    try {
      // Получаем бронь из БД или создаем новую
      let booking = await this.bookingRepository.findById(event.bookingId);

      if (!booking) {
        // Если брони нет в БД, создаем ее из события
        booking = Booking.fromPersistence(
          event.bookingId,
          event.restaurantId,
          new Date(event.date),
          event.time,
          event.guests,
          (event.duration as BookingDuration) || BookingDuration.ONE_HOUR,
          event.tableId || null,
          BookingStatus.CREATED,
          new Date(),
          new Date(),
        );
      } else {
        // Идемпотентность: если бронь уже обработана (CONFIRMED или REJECTED),
        // просто игнорируем повторное событие или обновляем статус на тот же
        const currentStatus = booking.getStatus();
        if (
          currentStatus === BookingStatus.CONFIRMED ||
          currentStatus === BookingStatus.REJECTED
        ) {
          this.logger.logBooking('info', 'Booking already processed, ignoring duplicate event', {
            bookingId: booking.getId(),
            correlationId,
            status: currentStatus,
          });
          // Публикуем событие обновления статуса для синхронизации (на случай, если API Service не получил предыдущее событие)
          await this.kafkaProducer.publishBookingStatusUpdated({
            bookingId: booking.getId(),
            status: currentStatus,
            correlationId,
          });
          return;
        }
      }

      // Обновляем статус на CHECKING_AVAILABILITY
      booking.updateStatus(BookingStatus.CHECKING_AVAILABILITY);
      booking = await this.bookingRepository.save(booking);

      this.logger.logBooking('info', 'Booking status updated to CHECKING_AVAILABILITY', {
        bookingId: booking.getId(),
        correlationId,
        status: BookingStatus.CHECKING_AVAILABILITY,
      });

      // Проверяем доступность
      const newStatus = await this.availabilityChecker.checkAvailability(booking);

      // Обновляем статус
      booking.updateStatus(newStatus);
      booking = await this.bookingRepository.save(booking);

      this.logger.logBooking('info', 'Booking availability checked', {
        bookingId: booking.getId(),
        correlationId,
        status: newStatus,
      });

      // Публикуем событие обновления статуса
      await this.kafkaProducer.publishBookingStatusUpdated({
        bookingId: booking.getId(),
        status: newStatus,
        correlationId,
      });

      this.logger.logBooking('info', 'Booking processed successfully', {
        bookingId: booking.getId(),
        correlationId,
        status: newStatus,
      });
    } catch (error) {
      this.logger.logBooking('error', 'Failed to process booking.created event', {
        bookingId: event.bookingId,
        correlationId,
        error: error.message,
      });
      throw error;
    }
  }
}

