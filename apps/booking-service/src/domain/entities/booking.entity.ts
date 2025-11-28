import { BookingStatus } from './booking-status.enum';
import { BookingDuration } from '../value-objects/booking-duration.enum';

export class Booking {
  private constructor(
    private readonly id: string,
    private readonly restaurantId: string,
    private readonly date: Date,
    private readonly time: string,
    private readonly guests: number,
    private readonly duration: BookingDuration,
    private readonly tableId: string | null,
    private status: BookingStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

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
      restaurantId,
      date,
      time,
      guests,
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

  /**
   * Создает новый объект Booking с обновленным tableId
   */
  withTableId(tableId: string): Booking {
    return new Booking(
      this.id,
      this.restaurantId,
      this.date,
      this.time,
      this.guests,
      this.duration,
      tableId,
      this.status,
      this.createdAt,
      new Date(), // Обновляем updatedAt
    );
  }

  getId(): string {
    return this.id;
  }

  getRestaurantId(): string {
    return this.restaurantId;
  }

  getDate(): Date {
    return this.date;
  }

  getTime(): string {
    return this.time;
  }

  getGuests(): number {
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
    const startDateTime = new Date(this.date);
    const [hours, minutes] = this.time.split(':').map(Number);
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

