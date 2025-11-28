import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreateBookingHandler } from './create-booking.handler';
import { CreateBookingCommand } from '../commands/create-booking.command';
import { Booking } from '../../domain/entities/booking.entity';
import { BookingStatus } from '../../domain/entities/booking-status.enum';
import { BookingDuration } from '../../domain/value-objects/booking-duration.enum';
import { RestaurantId } from '../../domain/value-objects/restaurant-id.vo';
import { BookingDate } from '../../domain/value-objects/booking-date.vo';
import { BookingTime } from '../../domain/value-objects/booking-time.vo';
import { GuestsCount } from '../../domain/value-objects/guests-count.vo';
import {
  IBookingRepository,
  BOOKING_REPOSITORY,
} from '../interfaces/booking.repository.interface';
import {
  ITableRepository,
  TABLE_REPOSITORY,
} from '../interfaces/table.repository.interface';
import { OutboxService } from '../../infrastructure/outbox/outbox.service';
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service';
import { Table } from '../../domain/entities/table.entity';

describe('CreateBookingHandler', () => {
  let handler: CreateBookingHandler;
  let mockBookingRepository: jest.Mocked<IBookingRepository>;
  let mockTableRepository: jest.Mocked<ITableRepository>;
  let mockOutboxService: jest.Mocked<OutboxService>;
  let mockLogger: jest.Mocked<StructuredLoggerService>;

  beforeEach(async () => {
    mockBookingRepository = {
      save: jest.fn(),
      findById: jest.fn(),
    };

    mockTableRepository = {
      findByRestaurant: jest.fn(),
      findById: jest.fn(),
      findAvailableTables: jest.fn(),
    };

    mockOutboxService = {
      saveEventInTransaction: jest.fn(),
    } as any;

    mockLogger = {
      logBooking: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBookingHandler,
        {
          provide: BOOKING_REPOSITORY,
          useValue: mockBookingRepository,
        },
        {
          provide: TABLE_REPOSITORY,
          useValue: mockTableRepository,
        },
        {
          provide: OutboxService,
          useValue: mockOutboxService,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    handler = module.get<CreateBookingHandler>(CreateBookingHandler);
  });

  describe('execute', () => {
    const createCommand = (overrides?: Partial<CreateBookingCommand>): CreateBookingCommand => ({
      restaurantId: '123e4567-e89b-12d3-a456-426614174000',
      date: '2025-12-25',
      time: '19:00',
      guests: 4,
      duration: BookingDuration.TWO_HOURS,
      correlationId: 'correlation-id-123',
      ...overrides,
    });

    const createMockTable = (id: string, capacity: number): Table => {
      return {
        getId: jest.fn().mockReturnValue(id),
        getCapacity: jest.fn().mockReturnValue(capacity),
        getRestaurantId: jest.fn(),
      } as any;
    };

    const createMockBooking = (): Booking => {
      const restaurantId = RestaurantId.create('123e4567-e89b-12d3-a456-426614174000');
      const date = BookingDate.create('2025-12-25');
      const time = BookingTime.create('19:00');
      const guests = GuestsCount.create(4);

      return Booking.create(
        restaurantId,
        date,
        time,
        guests,
        BookingDuration.TWO_HOURS,
        'table-id-123',
      );
    };

    it('should create booking successfully when table is available', async () => {
      const command = createCommand();
      const mockTable = createMockTable('table-id-123', 6);
      const mockBooking = createMockBooking();

      mockTableRepository.findAvailableTables.mockResolvedValue([mockTable]);
      mockOutboxService.saveEventInTransaction.mockImplementation(
        async (eventType, payload, callback) => {
          if (callback) {
            await callback();
          }
        },
      );
      mockBookingRepository.save.mockResolvedValue(mockBooking);

      const result = await handler.execute(command);

      expect(result).toBeInstanceOf(Booking);
      expect(mockTableRepository.findAvailableTables).toHaveBeenCalledWith(
        expect.any(RestaurantId),
        expect.any(Date),
        '19:00',
        BookingDuration.TWO_HOURS,
        4,
      );
      expect(mockOutboxService.saveEventInTransaction).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({
          restaurantId: command.restaurantId,
          date: expect.any(String),
          time: '19:00',
          guests: 4,
          duration: BookingDuration.TWO_HOURS,
          correlationId: command.correlationId,
        }),
        expect.any(Function),
      );
      expect(mockBookingRepository.save).toHaveBeenCalled();
      expect(mockLogger.logBooking).toHaveBeenCalled();
    });

    it('should throw NotFoundException when no tables are available', async () => {
      const command = createCommand();

      mockTableRepository.findAvailableTables.mockResolvedValue([]);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      expect(mockTableRepository.findAvailableTables).toHaveBeenCalled();
      expect(mockOutboxService.saveEventInTransaction).not.toHaveBeenCalled();
      expect(mockBookingRepository.save).not.toHaveBeenCalled();
    });

    it('should select first available table when multiple tables are available', async () => {
      const command = createCommand();
      const mockTable1 = createMockTable('table-id-1', 4);
      const mockTable2 = createMockTable('table-id-2', 6);
      const mockBooking = createMockBooking();

      mockTableRepository.findAvailableTables.mockResolvedValue([
        mockTable1,
        mockTable2,
      ]);
      mockOutboxService.saveEventInTransaction.mockImplementation(
        async (eventType, payload, callback) => {
          if (callback) {
            await callback();
          }
        },
      );
      mockBookingRepository.save.mockResolvedValue(mockBooking);

      await handler.execute(command);

      expect(mockTable1.getId).toHaveBeenCalled();
      expect(mockTable2.getId).not.toHaveBeenCalled();
    });

    it('should create booking with correct status (CREATED)', async () => {
      const command = createCommand();
      const mockTable = createMockTable('table-id-123', 6);
      const mockBooking = createMockBooking();

      mockTableRepository.findAvailableTables.mockResolvedValue([mockTable]);
      mockOutboxService.saveEventInTransaction.mockImplementation(
        async (eventType, payload, callback) => {
          if (callback) {
            await callback();
          }
        },
      );
      mockBookingRepository.save.mockResolvedValue(mockBooking);

      const result = await handler.execute(command);

      expect(result.getStatus()).toBe(BookingStatus.CREATED);
    });

    it('should use correlationId from command', async () => {
      const command = createCommand({ correlationId: 'custom-correlation-id' });
      const mockTable = createMockTable('table-id-123', 6);
      const mockBooking = createMockBooking();

      mockTableRepository.findAvailableTables.mockResolvedValue([mockTable]);
      mockOutboxService.saveEventInTransaction.mockImplementation(
        async (eventType, payload, callback) => {
          if (callback) {
            await callback();
          }
        },
      );
      mockBookingRepository.save.mockResolvedValue(mockBooking);

      await handler.execute(command);

      expect(mockOutboxService.saveEventInTransaction).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({
          correlationId: 'custom-correlation-id',
        }),
        expect.any(Function),
      );
    });

    it('should use default correlationId when not provided', async () => {
      const command = createCommand();
      delete command.correlationId;
      const mockTable = createMockTable('table-id-123', 6);
      const mockBooking = createMockBooking();

      mockTableRepository.findAvailableTables.mockResolvedValue([mockTable]);
      mockOutboxService.saveEventInTransaction.mockImplementation(
        async (eventType, payload, callback) => {
          if (callback) {
            await callback();
          }
        },
      );
      mockBookingRepository.save.mockResolvedValue(mockBooking);

      await handler.execute(command);

      expect(mockOutboxService.saveEventInTransaction).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({
          correlationId: 'unknown',
        }),
        expect.any(Function),
      );
    });

    it('should log booking creation', async () => {
      const command = createCommand();
      const mockTable = createMockTable('table-id-123', 6);
      const mockBooking = createMockBooking();

      mockTableRepository.findAvailableTables.mockResolvedValue([mockTable]);
      mockOutboxService.saveEventInTransaction.mockImplementation(
        async (eventType, payload, callback) => {
          if (callback) {
            await callback();
          }
        },
      );
      mockBookingRepository.save.mockResolvedValue(mockBooking);

      await handler.execute(command);

      expect(mockLogger.logBooking).toHaveBeenCalledWith(
        'info',
        'Creating booking',
        expect.objectContaining({
          correlationId: command.correlationId,
          restaurantId: command.restaurantId,
          date: command.date,
          time: command.time,
          guests: command.guests,
          duration: command.duration,
        }),
      );
      expect(mockLogger.logBooking).toHaveBeenCalledWith(
        'info',
        'Booking created successfully',
        expect.any(Object),
      );
    });
  });
});

