import { Module } from '@nestjs/common';
import { DatabaseModule } from '../infrastructure/database/database.module';
import { BookingRepository } from '../infrastructure/database/repositories/booking.repository';
import { TableRepository } from '../infrastructure/database/repositories/table.repository';
import {
  BOOKING_REPOSITORY,
} from '../application/interfaces/booking.repository.interface';
import {
  TABLE_REPOSITORY,
} from '../application/interfaces/table.repository.interface';
import { AvailabilityCheckerService } from '../domain/services/availability-checker.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    AvailabilityCheckerService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
    {
      provide: TABLE_REPOSITORY,
      useClass: TableRepository,
    },
  ],
  exports: [AvailabilityCheckerService, BOOKING_REPOSITORY, TABLE_REPOSITORY],
})
export class BookingsModule {}

