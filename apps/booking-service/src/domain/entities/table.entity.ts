export class Table {
  private constructor(
    private readonly id: string,
    private readonly restaurantId: string,
    private readonly capacity: number,
  ) {}

  static fromPersistence(
    id: string,
    restaurantId: string,
    capacity: number,
  ): Table {
    return new Table(id, restaurantId, capacity);
  }

  getId(): string {
    return this.id;
  }

  getRestaurantId(): string {
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

