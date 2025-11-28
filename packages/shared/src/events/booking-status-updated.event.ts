/**
 * Статусы бронирования
 */
export enum BookingStatus {
  CREATED = 'CREATED',
  CHECKING_AVAILABILITY = 'CHECKING_AVAILABILITY',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

/**
 * Событие обновления статуса брони
 * 
 * Публикуется: Booking Service
 * Подписывается: API Service
 */
export interface BookingStatusUpdatedEvent {
  bookingId: string;
  status: BookingStatus;
  correlationId?: string;
}

