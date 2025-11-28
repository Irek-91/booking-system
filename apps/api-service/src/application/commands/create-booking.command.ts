import { IsUUID, IsDateString, Matches, IsInt, Min, IsOptional, IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { BookingDuration } from '../../domain/value-objects/booking-duration.enum';

export class CreateBookingCommand {
  @IsUUID()
  restaurantId: string;

  @IsDateString()
  date: string;

  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:MM format',
  })
  time: string;

  @IsInt()
  @Min(1)
  guests: number;

  @IsNotEmpty()
  @IsEnum(BookingDuration)
  duration: BookingDuration;

  @IsOptional()
  @IsString()
  correlationId?: string;
}

