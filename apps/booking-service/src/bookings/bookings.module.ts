import { Module } from '@nestjs/common';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { BookingRepository } from '../infrastructure/database/repositories/booking.repository';
import {
  BOOKING_REPOSITORY,
} from '../application/interfaces/booking.repository.interface';
import { AvailabilityCheckerService } from '../domain/services/availability-checker.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    AvailabilityCheckerService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
  ],
  exports: [AvailabilityCheckerService, BOOKING_REPOSITORY],
})
export class BookingsModule {}

