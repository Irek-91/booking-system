/**
 * Shared пакет для типов событий Kafka
 * 
 * Используется обоими микросервисами для обеспечения
 * единообразия типов событий и проверки совместимости.
 */

export * from './events/booking-created.event';
export * from './events/booking-status-updated.event';

