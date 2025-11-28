# @booking-system/shared

Shared пакет для типов событий Kafka в Booking System.

## Назначение

Обеспечивает единообразие типов событий Kafka между микросервисами:
- **API Service** - публикует и подписывается на события
- **Booking Service** - публикует и подписывается на события

## Типы событий

### BookingCreatedEvent

Событие создания новой брони.

**Публикуется**: API Service  
**Подписывается**: Booking Service

```typescript
interface BookingCreatedEvent {
  bookingId: string;
  restaurantId: string;
  date: string;
  time: string;
  guests: number;
  duration: number;
  tableId: string;
  correlationId?: string;
}
```

### BookingStatusUpdatedEvent

Событие обновления статуса брони.

**Публикуется**: Booking Service  
**Подписывается**: API Service

```typescript
interface BookingStatusUpdatedEvent {
  bookingId: string;
  status: BookingStatus;
  correlationId?: string;
}
```

### BookingStatus

Enum статусов бронирования.

```typescript
enum BookingStatus {
  CREATED = 'CREATED',
  CHECKING_AVAILABILITY = 'CHECKING_AVAILABILITY',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}
```

## Структура

```
packages/shared/
├── src/
│   ├── events/
│   │   ├── booking-created.event.ts
│   │   └── booking-status-updated.event.ts
│   └── index.ts
├── dist/              # Скомпилированные файлы
├── package.json
├── tsconfig.json
└── README.md
```

