import { BookingTime } from './booking-time.vo';

describe('BookingTime', () => {
  describe('create', () => {
    it('should create BookingTime with valid HH:MM format', () => {
      const time = BookingTime.create('19:00');

      expect(time).toBeInstanceOf(BookingTime);
      expect(time.toString()).toBe('19:00');
    });

    it('should create BookingTime with valid HH:MM:SS format', () => {
      const time = BookingTime.create('19:00:30');

      expect(time).toBeInstanceOf(BookingTime);
      expect(time.toString()).toBe('19:00');
    });

    it('should normalize HH:MM:SS to HH:MM', () => {
      const time = BookingTime.create('19:30:45');

      expect(time.toString()).toBe('19:30');
    });

    it('should accept midnight time', () => {
      const time = BookingTime.create('00:00');

      expect(time.toString()).toBe('00:00');
    });

    it('should accept end of day time', () => {
      const time = BookingTime.create('23:59');

      expect(time.toString()).toBe('23:59');
    });

    it('should throw error for invalid format - missing colon', () => {
      expect(() => {
        BookingTime.create('1900');
      }).toThrow('Invalid time format. Expected HH:MM or HH:MM:SS');
    });

    it('should throw error for invalid format - single digit hour', () => {
      expect(() => {
        BookingTime.create('9:00');
      }).toThrow('Invalid time format. Expected HH:MM or HH:MM:SS');
    });

    it('should throw error for invalid format - hour > 23', () => {
      expect(() => {
        BookingTime.create('24:00');
      }).toThrow('Invalid time format. Expected HH:MM or HH:MM:SS');
    });

    it('should throw error for invalid format - minute > 59', () => {
      expect(() => {
        BookingTime.create('19:60');
      }).toThrow('Invalid time format. Expected HH:MM or HH:MM:SS');
    });

    it('should throw error for empty string', () => {
      expect(() => {
        BookingTime.create('');
      }).toThrow('Invalid time format. Expected HH:MM or HH:MM:SS');
    });

    it('should throw error for invalid format - letters', () => {
      expect(() => {
        BookingTime.create('ab:cd');
      }).toThrow('Invalid time format. Expected HH:MM or HH:MM:SS');
    });
  });

  describe('toString', () => {
    it('should return time in HH:MM format', () => {
      const time = BookingTime.create('19:30');

      expect(time.toString()).toBe('19:30');
    });

    it('should return normalized time without seconds', () => {
      const time = BookingTime.create('19:30:45');

      expect(time.toString()).toBe('19:30');
    });
  });

  describe('equals', () => {
    it('should return true for same time', () => {
      const time1 = BookingTime.create('19:00');
      const time2 = BookingTime.create('19:00');

      expect(time1.equals(time2)).toBe(true);
    });

    it('should return false for different times', () => {
      const time1 = BookingTime.create('19:00');
      const time2 = BookingTime.create('20:00');

      expect(time1.equals(time2)).toBe(false);
    });

    it('should return true for same time with different seconds', () => {
      const time1 = BookingTime.create('19:00:00');
      const time2 = BookingTime.create('19:00:30');

      expect(time1.equals(time2)).toBe(true);
    });
  });
});

