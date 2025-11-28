export class BookingTime {
  private constructor(private readonly value: string) {
    // Принимаем формат HH:MM или HH:MM:SS (из PostgreSQL)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (!timeRegex.test(value)) {
      throw new Error('Invalid time format. Expected HH:MM or HH:MM:SS');
    }
  }

  static create(value: string): BookingTime {
    // Нормализуем время до формата HH:MM (убираем секунды если есть)
    const normalizedValue = value.substring(0, 5);
    return new BookingTime(normalizedValue);
  }

  toString(): string {
    return this.value;
  }

  equals(other: BookingTime): boolean {
    return this.value === other.value;
  }
}

