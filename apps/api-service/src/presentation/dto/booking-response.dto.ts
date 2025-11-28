import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../domain/entities/booking-status.enum';
import { BookingDuration } from '../../domain/value-objects/booking-duration.enum';

export class BookingResponseDto {
  @ApiProperty({
    description: 'UUID бронирования',
    example: '91e939e9-0ab6-4bfa-a22e-768d1e49c436',
  })
  id: string;

  @ApiProperty({
    description: 'UUID ресторана',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  restaurantId: string;

  @ApiProperty({
    description: 'Дата бронирования в формате ISO 8601',
    example: '2025-12-01T00:00:00.000Z',
  })
  date: string;

  @ApiProperty({
    description: 'Время бронирования в формате HH:MM',
    example: '19:00',
  })
  time: string;

  @ApiProperty({
    description: 'Количество гостей',
    example: 4,
  })
  guests: number;

  @ApiProperty({
    description: 'Длительность бронирования в часах',
    example: 2,
    enum: BookingDuration,
  })
  duration: BookingDuration;

  @ApiProperty({
    description: 'UUID стола, закрепленного за бронь',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nullable: true,
  })
  tableId: string | null;

  @ApiProperty({
    description: 'Статус бронирования',
    example: 'CONFIRMED',
    enum: BookingStatus,
  })
  status: BookingStatus;

  @ApiProperty({
    description: 'Дата и время создания брони',
    example: '2025-11-27T17:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Дата и время последнего обновления брони',
    example: '2025-11-27T17:30:05.000Z',
  })
  updatedAt: Date;
}

