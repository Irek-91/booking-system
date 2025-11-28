import { Injectable, Inject } from '@nestjs/common';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingStatus } from '../../domain/entities/booking-status.enum';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../interfaces/booking.repository.interface';
import {
  ITableRepository,
  TABLE_REPOSITORY,
} from '../interfaces/table.repository.interface';
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
    @Inject(TABLE_REPOSITORY)
    private readonly tableRepository: ITableRepository,
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

      // Если tableId не указан, выбираем свободный стол
      if (!booking.getTableId()) {
        const availableTables = await this.tableRepository.findAvailableTables(
          booking.getRestaurantId(),
          booking.getDate(),
          booking.getTime(),
          booking.getDuration(),
          booking.getGuests(),
          booking.getId(), // Исключаем текущую бронь из проверки
        );

        if (availableTables.length === 0) {
          // Нет доступных столов - отклоняем бронь
          booking.updateStatus(BookingStatus.REJECTED);
          booking = await this.bookingRepository.save(booking);

          this.logger.logBooking('warn', 'No available tables found, rejecting booking', {
            bookingId: booking.getId(),
            correlationId,
            restaurantId: booking.getRestaurantId(),
            date: booking.getDate(),
            time: booking.getTime(),
            guests: booking.getGuests(),
            duration: booking.getDuration(),
          });

          // Публикуем событие об отклонении
          await this.kafkaProducer.publishBookingStatusUpdated({
            bookingId: booking.getId(),
            status: BookingStatus.REJECTED,
            correlationId,
          });

          return;
        }

        // Выбираем первый доступный стол
        const selectedTable = availableTables[0];
        booking = booking.withTableId(selectedTable.getId());
        booking = await this.bookingRepository.save(booking);

        this.logger.logBooking('info', 'Table selected for booking', {
          bookingId: booking.getId(),
          correlationId,
          tableId: selectedTable.getId(),
          tableCapacity: selectedTable.getCapacity(),
          guests: booking.getGuests(),
        });
      }

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

