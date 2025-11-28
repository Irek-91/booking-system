import { BookingDate } from './booking-date.vo';

describe('BookingDate', () => {
  describe('create', () => {
    it('should create BookingDate with future date (Date object)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      futureDate.setHours(12, 0, 0, 0);

      const bookingDate = BookingDate.create(futureDate);

      expect(bookingDate).toBeInstanceOf(BookingDate);
      expect(bookingDate.toDate().getTime()).toBe(futureDate.getTime());
    });

    it('should create BookingDate with future date (string)', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateString = futureDate.toISOString().split('T')[0];

      const bookingDate = BookingDate.create(dateString);

      expect(bookingDate).toBeInstanceOf(BookingDate);
    });

    it('should throw error for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      expect(() => {
        BookingDate.create(pastDate);
      }).toThrow('Booking date must be in the future');
    });

    it('should throw error for today date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      expect(() => {
        BookingDate.create(today);
      }).toThrow('Booking date must be in the future');
    });

    it('should accept tomorrow date even at end of day', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      const bookingDate = BookingDate.create(tomorrow);

      expect(bookingDate).toBeInstanceOf(BookingDate);
    });
  });

  describe('toDate', () => {
    it('should return Date object', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const bookingDate = BookingDate.create(futureDate);

      const date = bookingDate.toDate();

      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(futureDate.getTime());
    });
  });

  describe('toISOString', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const futureDate = new Date('2025-12-25');
      const bookingDate = BookingDate.create(futureDate);

      expect(bookingDate.toISOString()).toBe('2025-12-25');
    });

    it('should return date without time component', () => {
      const futureDate = new Date('2025-12-25T15:30:00');
      const bookingDate = BookingDate.create(futureDate);

      expect(bookingDate.toISOString()).toBe('2025-12-25');
    });
  });

  describe('equals', () => {
    it('should return true for same date', () => {
      const date1 = new Date('2025-12-25');
      const date2 = new Date('2025-12-25');
      const bookingDate1 = BookingDate.create(date1);
      const bookingDate2 = BookingDate.create(date2);

      expect(bookingDate1.equals(bookingDate2)).toBe(true);
    });

    it('should return false for different dates', () => {
      const date1 = new Date('2025-12-25');
      const date2 = new Date('2025-12-26');
      const bookingDate1 = BookingDate.create(date1);
      const bookingDate2 = BookingDate.create(date2);

      expect(bookingDate1.equals(bookingDate2)).toBe(false);
    });

    it('should return true for same date with different times', () => {
      const date1 = new Date('2025-12-25T10:00:00');
      const date2 = new Date('2025-12-25T20:00:00');
      const bookingDate1 = BookingDate.create(date1);
      const bookingDate2 = BookingDate.create(date2);

      expect(bookingDate1.equals(bookingDate2)).toBe(true);
    });
  });
});

