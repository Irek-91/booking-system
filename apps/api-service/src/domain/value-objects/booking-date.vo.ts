export class BookingDate {
  private constructor(private readonly value: Date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const bookingDate = new Date(this.value);
    bookingDate.setHours(0, 0, 0, 0);

    if (bookingDate <= now) {
      throw new Error('Booking date must be in the future');
    }
  }

  static create(value: Date | string): BookingDate {
    const date = typeof value === 'string' ? new Date(value) : value;
    return new BookingDate(date);
  }

  toDate(): Date {
    return new Date(this.value);
  }

  toISOString(): string {
    return this.value.toISOString().split('T')[0];
  }

  equals(other: BookingDate): boolean {
    return this.toISOString() === other.toISOString();
  }
}

