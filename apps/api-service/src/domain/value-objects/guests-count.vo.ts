export class GuestsCount {
  private constructor(private readonly value: number) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error('Guests count must be a positive integer');
    }
  }

  static create(value: number): GuestsCount {
    return new GuestsCount(value);
  }

  toNumber(): number {
    return this.value;
  }

  equals(other: GuestsCount): boolean {
    return this.value === other.value;
  }
}

