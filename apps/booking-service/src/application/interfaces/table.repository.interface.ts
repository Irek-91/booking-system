import { Table } from '../../domain/entities/table.entity';

export const TABLE_REPOSITORY = Symbol('TABLE_REPOSITORY');

export interface ITableRepository {
  findByRestaurant(restaurantId: string): Promise<Table[]>;
  findById(id: string): Promise<Table | null>;
  findAvailableTables(
    restaurantId: string,
    date: Date,
    startTime: string,
    duration: number,
    minCapacity: number,
    excludeBookingId?: string,
  ): Promise<Table[]>;
}

