/**
 * Событие создания новой брони
 * 
 * Публикуется: API Service
 * Подписывается: Booking Service
 */
export interface BookingCreatedEvent {
  bookingId: string;
  restaurantId: string;
  date: string;
  time: string;
  guests: number;
  duration: number;
  tableId: string;
  correlationId?: string;
}
