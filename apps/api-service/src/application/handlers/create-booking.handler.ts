import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateBookingCommand } from '../commands/create-booking.command';
import { Booking } from '../../domain/entities/booking.entity';
import { RestaurantId } from '../../domain/value-objects/restaurant-id.vo';
import { BookingDate } from '../../domain/value-objects/booking-date.vo';
import { BookingTime } from '../../domain/value-objects/booking-time.vo';
import { GuestsCount } from '../../domain/value-objects/guests-count.vo';
import {
  BOOKING_REPOSITORY,
} from '../interfaces/booking.repository.interface';
import type { IBookingRepository } from '../interfaces/booking.repository.interface';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service';

@CommandHandler(CreateBookingCommand)
export class CreateBookingHandler
  implements ICommandHandler<CreateBookingCommand>
{
  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly outboxService: OutboxService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async execute(command: CreateBookingCommand): Promise<Booking> {
    const correlationId = command.correlationId || 'unknown';

    this.logger.logBooking('info', 'Creating booking', {
      correlationId,
      restaurantId: command.restaurantId,
      date: command.date,
      time: command.time,
      guests: command.guests,
      duration: command.duration,
    });

    const restaurantId = RestaurantId.create(command.restaurantId);
    const date = BookingDate.create(command.date);
    const time = BookingTime.create(command.time);
    const guests = GuestsCount.create(command.guests);

    // Создаем бронь БЕЗ проверки доступности и БЕЗ tableId
    // Проверка доступности и выбор стола будут выполнены асинхронно в Booking Service
    const booking = Booking.create(
      restaurantId,
      date,
      time,
      guests,
      command.duration,
      null, // tableId будет назначен в Booking Service после проверки доступности
    );
    let savedBooking: Booking;

    // Сохраняем бронь и событие в одной транзакции через Outbox Pattern
    await this.outboxService.saveEventInTransaction(
      'booking.created',
      {
        bookingId: booking.getId(),
        restaurantId: booking.getRestaurantId().toString(),
        date: booking.getDate().toISOString(),
        time: booking.getTime().toString(),
        guests: booking.getGuests().toNumber(),
        duration: booking.getDuration(),
        tableId: null, // Будет назначен в Booking Service
        correlationId,
      },
      async () => {
        savedBooking = await this.bookingRepository.save(booking);
      },
    );

    this.logger.logBooking('info', 'Booking created successfully', {
      bookingId: savedBooking!.getId(),
      correlationId,
      status: savedBooking!.getStatus(),
      restaurantId: savedBooking!.getRestaurantId().toString(),
    });

    return savedBooking!;
  }
}

