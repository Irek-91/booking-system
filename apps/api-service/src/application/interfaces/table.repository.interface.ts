import { Table } from '../../domain/entities/table.entity';
import { RestaurantId } from '../../domain/value-objects/restaurant-id.vo';

export const TABLE_REPOSITORY = Symbol('TABLE_REPOSITORY');

export interface ITableRepository {
  findByRestaurant(restaurantId: RestaurantId): Promise<Table[]>;
  findById(id: string): Promise<Table | null>;
  findAvailableTables(
    restaurantId: RestaurantId,
    date: Date,
    startTime: string,
    duration: number,
    minCapacity: number,
    excludeBookingId?: string,
  ): Promise<Table[]>;
}

