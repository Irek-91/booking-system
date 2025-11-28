import { RestaurantId } from '../value-objects/restaurant-id.vo';

export class Table {
  private constructor(
    private readonly id: string,
    private readonly restaurantId: RestaurantId,
    private readonly capacity: number,
  ) {}

  static create(restaurantId: RestaurantId, capacity: number): Table {
    return new Table('', restaurantId, capacity);
  }

  static fromPersistence(
    id: string,
    restaurantId: string,
    capacity: number,
  ): Table {
    return new Table(id, RestaurantId.create(restaurantId), capacity);
  }

  getId(): string {
    return this.id;
  }

  getRestaurantId(): RestaurantId {
    return this.restaurantId;
  }

  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Проверяет, подходит ли стол для указанного количества гостей
   */
  canAccommodate(guests: number): boolean {
    return this.capacity >= guests;
  }
}

