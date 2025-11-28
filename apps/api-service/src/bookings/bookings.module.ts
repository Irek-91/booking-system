import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { TablesModule } from '../infrastructure/database/tables.module';
import { OutboxModule } from '../infrastructure/outbox/outbox.module';
import { BookingRepository } from '../infrastructure/database/repositories/booking.repository';
import {
  BOOKING_REPOSITORY,
} from '../application/interfaces/booking.repository.interface';
import { CreateBookingHandler } from '../application/handlers/create-booking.handler';
import { GetBookingHandler } from '../application/handlers/get-booking.handler';
import { BookingsController } from '../presentation/controllers/bookings.controller';

const handlers = [CreateBookingHandler, GetBookingHandler];

@Module({
  imports: [CqrsModule, DatabaseModule, TablesModule, OutboxModule],
  controllers: [BookingsController],
  providers: [
    ...handlers,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
  ],
  exports: [BOOKING_REPOSITORY],
})
export class BookingsModule {}

