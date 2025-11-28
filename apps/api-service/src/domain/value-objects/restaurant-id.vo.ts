import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export class RestaurantId {
  private constructor(private readonly value: string) {
    if (!uuidValidate(value)) {
      throw new Error('Invalid restaurant ID format');
    }
  }

  static create(value: string): RestaurantId {
    return new RestaurantId(value);
  }

  static generate(): RestaurantId {
    return new RestaurantId(uuidv4());
  }

  toString(): string {
    return this.value;
  }

  equals(other: RestaurantId): boolean {
    return this.value === other.value;
  }
}

