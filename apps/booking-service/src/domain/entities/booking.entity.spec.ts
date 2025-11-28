import { Booking } from './booking.entity';
import { BookingStatus } from './booking-status.enum';
import { BookingDuration } from '../value-objects/booking-duration.enum';

describe('Booking', () => {
  const mockBookingData = {
    id: 'booking-id-123',
    restaurantId: 'restaurant-id-456',
    date: new Date('2025-12-25'),
    time: '19:00',
    guests: 4,
    duration: BookingDuration.TWO_HOURS,
    tableId: 'table-id-789',
    status: BookingStatus.CREATED,
    createdAt: new Date('2025-12-20T10:00:00Z'),
    updatedAt: new Date('2025-12-20T10:00:00Z'),
  };

  describe('fromPersistence', () => {
    it('should create Booking from persistence data', () => {
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        mockBookingData.date,
        mockBookingData.time,
        mockBookingData.guests,
        mockBookingData.duration,
        mockBookingData.tableId,
        mockBookingData.status,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      expect(booking).toBeInstanceOf(Booking);
      expect(booking.getId()).toBe(mockBookingData.id);
      expect(booking.getRestaurantId()).toBe(mockBookingData.restaurantId);
      expect(booking.getDate()).toEqual(mockBookingData.date);
      expect(booking.getTime()).toBe(mockBookingData.time);
      expect(booking.getGuests()).toBe(mockBookingData.guests);
      expect(booking.getDuration()).toBe(mockBookingData.duration);
      expect(booking.getTableId()).toBe(mockBookingData.tableId);
      expect(booking.getStatus()).toBe(mockBookingData.status);
      expect(booking.getCreatedAt()).toEqual(mockBookingData.createdAt);
      expect(booking.getUpdatedAt()).toEqual(mockBookingData.updatedAt);
    });

    it('should create Booking with null tableId', () => {
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        mockBookingData.date,
        mockBookingData.time,
        mockBookingData.guests,
        mockBookingData.duration,
        null,
        mockBookingData.status,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      expect(booking.getTableId()).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update booking status', () => {
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        mockBookingData.date,
        mockBookingData.time,
        mockBookingData.guests,
        mockBookingData.duration,
        mockBookingData.tableId,
        BookingStatus.CREATED,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );
      
      booking.updateStatus(BookingStatus.CONFIRMED);

      expect(booking.getStatus()).toBe(BookingStatus.CONFIRMED);
      expect(booking.getUpdatedAt()).toBeInstanceOf(Date);
    });

    it('should update status to CHECKING_AVAILABILITY', () => {
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        mockBookingData.date,
        mockBookingData.time,
        mockBookingData.guests,
        mockBookingData.duration,
        mockBookingData.tableId,
        BookingStatus.CREATED,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      booking.updateStatus(BookingStatus.CHECKING_AVAILABILITY);

      expect(booking.getStatus()).toBe(BookingStatus.CHECKING_AVAILABILITY);
    });

    it('should update status to REJECTED', () => {
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        mockBookingData.date,
        mockBookingData.time,
        mockBookingData.guests,
        mockBookingData.duration,
        mockBookingData.tableId,
        BookingStatus.CHECKING_AVAILABILITY,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      booking.updateStatus(BookingStatus.REJECTED);

      expect(booking.getStatus()).toBe(BookingStatus.REJECTED);
    });
  });

  describe('getStartTime', () => {
    it('should calculate start time correctly', () => {
      const date = new Date('2025-12-25');
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        date,
        '19:00',
        mockBookingData.guests,
        mockBookingData.duration,
        mockBookingData.tableId,
        mockBookingData.status,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      const startTime = booking.getStartTime();

      expect(startTime.getFullYear()).toBe(2025);
      expect(startTime.getMonth()).toBe(11); // December is month 11
      expect(startTime.getDate()).toBe(25);
      expect(startTime.getHours()).toBe(19);
      expect(startTime.getMinutes()).toBe(0);
      expect(startTime.getSeconds()).toBe(0);
    });

    it('should handle midnight time', () => {
      const date = new Date('2025-12-25');
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        date,
        '00:00',
        mockBookingData.guests,
        mockBookingData.duration,
        mockBookingData.tableId,
        mockBookingData.status,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      const startTime = booking.getStartTime();

      expect(startTime.getHours()).toBe(0);
      expect(startTime.getMinutes()).toBe(0);
    });
  });

  describe('getEndTime', () => {
    it('should calculate end time correctly for 1 hour duration', () => {
      const date = new Date('2025-12-25');
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        date,
        '19:00',
        mockBookingData.guests,
        BookingDuration.ONE_HOUR,
        mockBookingData.tableId,
        mockBookingData.status,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      const endTime = booking.getEndTime();

      expect(endTime.getHours()).toBe(20);
      expect(endTime.getMinutes()).toBe(0);
    });

    it('should calculate end time correctly for 2 hours duration', () => {
      const date = new Date('2025-12-25');
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        date,
        '19:00',
        mockBookingData.guests,
        BookingDuration.TWO_HOURS,
        mockBookingData.tableId,
        mockBookingData.status,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      const endTime = booking.getEndTime();

      expect(endTime.getHours()).toBe(21);
      expect(endTime.getMinutes()).toBe(0);
    });

    it('should handle end time crossing midnight', () => {
      const date = new Date('2025-12-25');
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        date,
        '23:00',
        mockBookingData.guests,
        BookingDuration.TWO_HOURS,
        mockBookingData.tableId,
        mockBookingData.status,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      const endTime = booking.getEndTime();

      expect(endTime.getHours()).toBe(1);
      expect(endTime.getDate()).toBe(26);
    });
  });

  describe('getters', () => {
    it('should return all booking properties correctly', () => {
      const booking = Booking.fromPersistence(
        mockBookingData.id,
        mockBookingData.restaurantId,
        mockBookingData.date,
        mockBookingData.time,
        mockBookingData.guests,
        mockBookingData.duration,
        mockBookingData.tableId,
        mockBookingData.status,
        mockBookingData.createdAt,
        mockBookingData.updatedAt,
      );

      expect(booking.getId()).toBe(mockBookingData.id);
      expect(booking.getRestaurantId()).toBe(mockBookingData.restaurantId);
      expect(booking.getDate()).toEqual(mockBookingData.date);
      expect(booking.getTime()).toBe(mockBookingData.time);
      expect(booking.getGuests()).toBe(mockBookingData.guests);
      expect(booking.getDuration()).toBe(mockBookingData.duration);
      expect(booking.getTableId()).toBe(mockBookingData.tableId);
      expect(booking.getStatus()).toBe(mockBookingData.status);
      expect(booking.getCreatedAt()).toEqual(mockBookingData.createdAt);
      expect(booking.getUpdatedAt()).toEqual(mockBookingData.updatedAt);
    });
  });
});

