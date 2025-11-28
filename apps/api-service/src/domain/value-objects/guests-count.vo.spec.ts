import { GuestsCount } from './guests-count.vo';

describe('GuestsCount', () => {
  describe('create', () => {
    it('should create GuestsCount with positive integer', () => {
      const guests = GuestsCount.create(4);

      expect(guests).toBeInstanceOf(GuestsCount);
      expect(guests.toNumber()).toBe(4);
    });

    it('should create GuestsCount with minimum value (1)', () => {
      const guests = GuestsCount.create(1);

      expect(guests).toBeInstanceOf(GuestsCount);
      expect(guests.toNumber()).toBe(1);
    });

    it('should create GuestsCount with large number', () => {
      const guests = GuestsCount.create(100);

      expect(guests).toBeInstanceOf(GuestsCount);
      expect(guests.toNumber()).toBe(100);
    });

    it('should throw error for zero', () => {
      expect(() => {
        GuestsCount.create(0);
      }).toThrow('Guests count must be a positive integer');
    });

    it('should throw error for negative number', () => {
      expect(() => {
        GuestsCount.create(-1);
      }).toThrow('Guests count must be a positive integer');
    });

    it('should throw error for negative large number', () => {
      expect(() => {
        GuestsCount.create(-100);
      }).toThrow('Guests count must be a positive integer');
    });

    it('should throw error for decimal number', () => {
      expect(() => {
        GuestsCount.create(4.5);
      }).toThrow('Guests count must be a positive integer');
    });

    it('should throw error for float', () => {
      expect(() => {
        GuestsCount.create(3.14);
      }).toThrow('Guests count must be a positive integer');
    });
  });

  describe('toNumber', () => {
    it('should return number value', () => {
      const guests = GuestsCount.create(5);

      expect(guests.toNumber()).toBe(5);
      expect(typeof guests.toNumber()).toBe('number');
    });
  });

  describe('equals', () => {
    it('should return true for equal counts', () => {
      const guests1 = GuestsCount.create(4);
      const guests2 = GuestsCount.create(4);

      expect(guests1.equals(guests2)).toBe(true);
    });

    it('should return false for different counts', () => {
      const guests1 = GuestsCount.create(4);
      const guests2 = GuestsCount.create(5);

      expect(guests1.equals(guests2)).toBe(false);
    });
  });
});

