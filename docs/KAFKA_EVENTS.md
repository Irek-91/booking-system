# Формат событий Kafka

## Обзор

Booking System использует Kafka для асинхронной коммуникации между микросервисами. 
Все события содержат `correlationId` для отслеживания запросов через систему.

## События

### booking.created

**Топик**: `booking.created`

**Источник**: API Service

**Назначение**: Уведомление о создании новой брони

**Структура**:
```json
{
  "bookingId": "91e939e9-0ab6-4bfa-a22e-768d1e49c436",
  "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-12-01T00:00:00.000Z",
  "time": "19:00",
  "guests": 4,
  "duration": 2,
  "tableId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlationId": "test-123"
}
```

**Поля**:
- `bookingId` (string, UUID) - уникальный идентификатор брони
- `restaurantId` (string, UUID) - идентификатор ресторана
- `date` (string, ISO 8601) - дата бронирования
- `time` (string, HH:MM) - время бронирования в 24-часовом формате
- `guests` (number) - количество гостей
- `duration` (number) - длительность бронирования в часах (1, 2, 3 или 4)
- `tableId` (string, UUID) - идентификатор стола, закрепленного за бронь
- `correlationId` (string, optional) - ID для отслеживания запроса

**Обработчик**: Booking Service (`BookingCreatedHandler`)

**Действия обработчика**:
1. Получает или создает бронь в локальной БД
2. Обновляет статус на `CHECKING_AVAILABILITY`
3. Проверяет доступность стола через `AvailabilityCheckerService`
4. Обновляет статус на `CONFIRMED` или `REJECTED`
5. Публикует событие `booking.status.updated`

### booking.status.updated

**Топик**: `booking.status.updated`

**Источник**: Booking Service

**Назначение**: Уведомление об обновлении статуса брони

**Структура**:
```json
{
  "bookingId": "91e939e9-0ab6-4bfa-a22e-768d1e49c436",
  "status": "CONFIRMED",
  "correlationId": "test-123"
}
```

**Поля**:
- `bookingId` (string, UUID) - уникальный идентификатор брони
- `status` (string, enum) - новый статус брони:
  - `CREATED` - бронь создана
  - `CHECKING_AVAILABILITY` - проверка доступности
  - `CONFIRMED` - бронь подтверждена
  - `REJECTED` - бронь отклонена
- `correlationId` (string, optional) - ID для отслеживания запроса

**Обработчик**: API Service (`BookingStatusUpdatedHandler`)

**Действия обработчика**:
1. Находит бронь в локальной БД по `bookingId`
2. Обновляет статус брони
3. Сохраняет изменения

## Конфигурация Kafka

### Producer (API Service)

```typescript
{
  clientId: 'api-service',
  brokers: ['kafka:29092'],
  createPartitioner: LegacyPartitioner
}
```

### Consumer (Booking Service)

```typescript
{
  groupId: 'booking-service-consumer',
  clientId: 'booking-service',
  brokers: ['kafka:29092'],
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  retry: {
    retries: 3,
    initialRetryTime: 100,
    multiplier: 2,
    maxRetryTime: 30000
  }
}
```

## Retry и обработка ошибок

### Consumer Retry

При ошибке обработки события:
1. Сообщение возвращается в топик
2. Выполняется retry с экспоненциальной задержкой
3. После максимального количества попыток сообщение отправляется в DLQ

### Dead Letter Queue (DLQ)

Необработанные сообщения отправляются в топик `booking.failed` с метаданными:
- Оригинальное сообщение
- Причина ошибки
- Количество попыток
- Timestamp

## Идемпотентность

Обработчики событий идемпотентны:
- Проверяют статус брони перед обработкой
- Если бронь уже обработана (CONFIRMED/REJECTED), игнорируют повторное событие
- Публикуют событие обновления статуса для синхронизации

