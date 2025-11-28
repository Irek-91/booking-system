import { IsUUID } from 'class-validator';

export class GetBookingQuery {
  @IsUUID()
  id: string;
}

