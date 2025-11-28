import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { GetBookingQuery } from '../queries/get-booking.query';
import { Booking } from '../../domain/entities/booking.entity';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../interfaces/booking.repository.interface';

@QueryHandler(GetBookingQuery)
export class GetBookingHandler implements IQueryHandler<GetBookingQuery> {
  private readonly logger = new Logger(GetBookingHandler.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
  ) {}

  async execute(query: GetBookingQuery): Promise<Booking> {
    this.logger.log(`Getting booking with ID: ${query.id}`);

    const booking = await this.bookingRepository.findById(query.id);

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${query.id} not found`);
    }

    return booking;
  }
}

