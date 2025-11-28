import { IsUUID, IsDateString, Matches, IsInt, Min, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingDuration } from '../../domain/value-objects/booking-duration.enum';

export class CreateBookingDto {
  @ApiProperty({
    description: 'UUID ресторана',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'restaurantId is required' })
  @IsUUID(undefined, { message: 'restaurantId must be a valid UUID' })
  restaurantId: string;

  @ApiProperty({
    description: 'Дата бронирования в формате YYYY-MM-DD',
    example: '2025-12-01',
    type: String,
    format: 'date',
  })
  @IsNotEmpty({ message: 'date is required' })
  @IsDateString({}, { message: 'date must be a valid date in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({
    description: 'Время бронирования в формате HH:MM (24-часовой формат)',
    example: '19:00',
    type: String,
    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
  })
  @IsNotEmpty({ message: 'time is required' })
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'time must be in HH:MM format (24-hour)',
  })
  time: string;

  @ApiProperty({
    description: 'Количество гостей',
    example: 4,
    type: Number,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'guests is required' })
  @IsInt({ message: 'guests must be an integer' })
  @Min(1, { message: 'guests must be at least 1' })
  guests: number;

  @ApiProperty({
    description: 'Длительность бронирования в часах',
    example: 2,
    enum: BookingDuration,
    enumName: 'BookingDuration',
  })
  @IsNotEmpty({ message: 'duration is required' })
  @IsEnum(BookingDuration, {
    message: 'duration must be 1, 2, 3, or 4 hours',
  })
  duration: BookingDuration;
}

