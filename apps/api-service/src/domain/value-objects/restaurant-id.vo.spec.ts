import { RestaurantId } from './restaurant-id.vo';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

describe('RestaurantId', () => {
  describe('create', () => {
    it('should create RestaurantId with valid UUID', () => {
      const validUuid = uuidv4();
      const restaurantId = RestaurantId.create(validUuid);

      expect(restaurantId).toBeInstanceOf(RestaurantId);
      expect(restaurantId.toString()).toBe(validUuid);
    });

    it('should throw error for invalid UUID format', () => {
      const invalidUuid = 'invalid-uuid';

      expect(() => {
        RestaurantId.create(invalidUuid);
      }).toThrow('Invalid restaurant ID format');
    });

    it('should throw error for empty string', () => {
      expect(() => {
        RestaurantId.create('');
      }).toThrow('Invalid restaurant ID format');
    });

    it('should throw error for non-UUID string', () => {
      expect(() => {
        RestaurantId.create('12345');
      }).toThrow('Invalid restaurant ID format');
    });
  });

  describe('generate', () => {
    it('should generate valid RestaurantId', () => {
      const restaurantId = RestaurantId.generate();

      expect(restaurantId).toBeInstanceOf(RestaurantId);
      expect(uuidValidate(restaurantId.toString())).toBe(true);
    });

    it('should generate unique RestaurantIds', () => {
      const id1 = RestaurantId.generate();
      const id2 = RestaurantId.generate();

      expect(id1.toString()).not.toBe(id2.toString());
    });
  });

  describe('toString', () => {
    it('should return UUID string', () => {
      const uuid = uuidv4();
      const restaurantId = RestaurantId.create(uuid);

      expect(restaurantId.toString()).toBe(uuid);
    });
  });

  describe('equals', () => {
    it('should return true for equal RestaurantIds', () => {
      const uuid = uuidv4();
      const id1 = RestaurantId.create(uuid);
      const id2 = RestaurantId.create(uuid);

      expect(id1.equals(id2)).toBe(true);
    });

    it('should return false for different RestaurantIds', () => {
      const id1 = RestaurantId.generate();
      const id2 = RestaurantId.generate();

      expect(id1.equals(id2)).toBe(false);
    });
  });
});

