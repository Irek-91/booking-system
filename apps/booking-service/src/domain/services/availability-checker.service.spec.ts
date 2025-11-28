import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityCheckerService } from './availability-checker.service';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../entities/booking-status.enum';
import { BookingDuration } from '../value-objects/booking-duration.enum';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../../application/interfaces/booking.repository.interface';

describe('AvailabilityCheckerService', () => {
  let service: AvailabilityCheckerService;
  let mockRepository: jest.Mocked<IBookingRepository>;

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByRestaurantDateAndTimeRange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityCheckerService,
        {
          provide: BOOKING_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AvailabilityCheckerService>(
      AvailabilityCheckerService,
    );
  });

  describe('checkAvailability', () => {
    const createMockBooking = (
      id: string,
      restaurantId: string,
      date: Date,
      time: string,
      duration: BookingDuration,
      tableId: string | null = null,
      status: BookingStatus = BookingStatus.CREATED,
    ): Booking => {
      return Booking.fromPersistence(
        id,
        restaurantId,
        date,
        time,
        4,
        duration,
        tableId,
        status,
        new Date(),
        new Date(),
      );
    };

    it('should return CONFIRMED when no conflicting bookings exist', async () => {
      const booking = createMockBooking(
        'booking-1',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        'table-1',
      );

      mockRepository.findByRestaurantDateAndTimeRange.mockResolvedValue([]);

      const result = await service.checkAvailability(booking);

      expect(result).toBe(BookingStatus.CONFIRMED);
      expect(
        mockRepository.findByRestaurantDateAndTimeRange,
      ).toHaveBeenCalledWith(
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        2,
        'table-1',
      );
    });

    it('should return REJECTED when conflicting booking exists', async () => {
      const booking = createMockBooking(
        'booking-1',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        'table-1',
      );

      const conflictingBooking = createMockBooking(
        'booking-2',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:30',
        BookingDuration.TWO_HOURS,
        'table-1',
        BookingStatus.CONFIRMED,
      );

      mockRepository.findByRestaurantDateAndTimeRange.mockResolvedValue([
        conflictingBooking,
      ]);

      const result = await service.checkAvailability(booking);

      expect(result).toBe(BookingStatus.REJECTED);
    });

    it('should return CONFIRMED when conflicting booking is the same booking', async () => {
      const booking = createMockBooking(
        'booking-1',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        'table-1',
      );

      const sameBooking = createMockBooking(
        'booking-1',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        'table-1',
        BookingStatus.CONFIRMED,
      );

      mockRepository.findByRestaurantDateAndTimeRange.mockResolvedValue([
        sameBooking,
      ]);

      const result = await service.checkAvailability(booking);

      expect(result).toBe(BookingStatus.CONFIRMED);
    });

    it('should return CONFIRMED when conflicting booking is on different table', async () => {
      const booking = createMockBooking(
        'booking-1',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        'table-1',
      );

      mockRepository.findByRestaurantDateAndTimeRange.mockResolvedValue([]);

      const result = await service.checkAvailability(booking);

      expect(result).toBe(BookingStatus.CONFIRMED);
      expect(
        mockRepository.findByRestaurantDateAndTimeRange,
      ).toHaveBeenCalledWith(
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        2,
        'table-1',
      );
    });

    it('should return REJECTED when multiple conflicting bookings exist', async () => {
      const booking = createMockBooking(
        'booking-1',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        'table-1',
      );

      const conflictingBooking1 = createMockBooking(
        'booking-2',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:30',
        BookingDuration.TWO_HOURS,
        'table-1',
        BookingStatus.CONFIRMED,
      );

      const conflictingBooking2 = createMockBooking(
        'booking-3',
        'restaurant-1',
        new Date('2025-12-25'),
        '20:00',
        BookingDuration.TWO_HOURS,
        'table-1',
        BookingStatus.CONFIRMED,
      );

      mockRepository.findByRestaurantDateAndTimeRange.mockResolvedValue([
        conflictingBooking1,
        conflictingBooking2,
      ]);

      const result = await service.checkAvailability(booking);

      expect(result).toBe(BookingStatus.REJECTED);
    });

    it('should check availability for booking without tableId', async () => {
      const booking = createMockBooking(
        'booking-1',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        null,
      );

      mockRepository.findByRestaurantDateAndTimeRange.mockResolvedValue([]);

      const result = await service.checkAvailability(booking);

      expect(result).toBe(BookingStatus.CONFIRMED);
      expect(
        mockRepository.findByRestaurantDateAndTimeRange,
      ).toHaveBeenCalledWith(
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        2,
        null,
      );
    });

    it('should return CONFIRMED when conflicting booking has CREATED status (not confirmed)', async () => {
      const booking = createMockBooking(
        'booking-1',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        'table-1',
      );

      const unconfirmedBooking = createMockBooking(
        'booking-2',
        'restaurant-1',
        new Date('2025-12-25'),
        '19:00',
        BookingDuration.TWO_HOURS,
        'table-1',
        BookingStatus.CREATED,
      );

      mockRepository.findByRestaurantDateAndTimeRange.mockResolvedValue([
        unconfirmedBooking,
      ]);

      const result = await service.checkAvailability(booking);

      expect(result).toBe(BookingStatus.REJECTED);
    });
  });
});

