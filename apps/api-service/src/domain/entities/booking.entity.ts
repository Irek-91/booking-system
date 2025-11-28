import { v4 as uuidv4 } from 'uuid';
import { BookingStatus } from './booking-status.enum';
import { RestaurantId } from '../value-objects/restaurant-id.vo';
import { BookingDate } from '../value-objects/booking-date.vo';
import { BookingTime } from '../value-objects/booking-time.vo';
import { GuestsCount } from '../value-objects/guests-count.vo';
import { BookingDuration } from '../value-objects/booking-duration.enum';

export class Booking {
  private constructor(
    private readonly id: string,
    private readonly restaurantId: RestaurantId,
    private readonly date: BookingDate,
    private readonly time: BookingTime,
    private readonly guests: GuestsCount,
    private readonly duration: BookingDuration,
    private readonly tableId: string | null,
    private status: BookingStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(
    restaurantId: RestaurantId,
    date: BookingDate,
    time: BookingTime,
    guests: GuestsCount,
    duration: BookingDuration,
    tableId: string | null = null,
  ): Booking {
    const now = new Date();
    return new Booking(
      uuidv4(),
      restaurantId,
      date,
      time,
      guests,
      duration,
      tableId,
      BookingStatus.CREATED,
      now,
      now,
    );
  }

  static fromPersistence(
    id: string,
    restaurantId: string,
    date: Date,
    time: string,
    guests: number,
    duration: BookingDuration,
    tableId: string | null,
    status: BookingStatus,
    createdAt: Date,
    updatedAt: Date,
  ): Booking {
    return new Booking(
      id,
      RestaurantId.create(restaurantId),
      BookingDate.create(date),
      BookingTime.create(time),
      GuestsCount.create(guests),
      duration,
      tableId,
      status,
      createdAt,
      updatedAt,
    );
  }

  updateStatus(status: BookingStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getRestaurantId(): RestaurantId {
    return this.restaurantId;
  }

  getDate(): BookingDate {
    return this.date;
  }

  getTime(): BookingTime {
    return this.time;
  }

  getGuests(): GuestsCount {
    return this.guests;
  }

  getDuration(): BookingDuration {
    return this.duration;
  }

  getTableId(): string | null {
    return this.tableId;
  }

  getStatus(): BookingStatus {
    return this.status;
  }

  /**
   * Вычисляет время начала брони
   */
  getStartTime(): Date {
    const startDateTime = new Date(this.date.toDate());
    const [hours, minutes] = this.time.toString().split(':').map(Number);
    startDateTime.setHours(hours, minutes, 0, 0);
    return startDateTime;
  }

  /**
   * Вычисляет время окончания брони (начало + длительность)
   */
  getEndTime(): Date {
    const startDateTime = this.getStartTime();
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(endDateTime.getHours() + this.duration);
    return endDateTime;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}

