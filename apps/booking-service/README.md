# Booking Service

Booking Service для обработки событий бронирования и проверки доступности столиков.

## Предварительные требования

1. Запущенная инфраструктура (PostgreSQL, Kafka, Redis)
2. Node.js 18+ и npm
3. Установленные зависимости проекта

## Быстрый старт

### 1. Убедитесь, что инфраструктура запущена

```bash
cd ../../infrastructure
docker-compose ps
```

Все сервисы должны быть в статусе `Up` и `healthy`.

Если инфраструктура не запущена:

```bash
cd ../../infrastructure
cp .env.example .env
docker-compose up -d
```

### 2. Настройте переменные окружения

#### Для локального запуска (рекомендуется для разработки):

Если вы запускаете Booking Service локально (не в Docker), используйте `localhost` для подключения к сервисам:

```bash
# Используйте .env.local или обновите .env
cp .env.local .env
```

Или вручную обновите `.env` файл, заменив Docker hostnames на `localhost`:
- `DB_HOST=localhost` (вместо `postgres`)
- `KAFKA_BROKERS=localhost:9092` (вместо `kafka:29092`)

#### Для запуска в Docker:

Если Booking Service будет запускаться в Docker контейнере, используйте Docker hostnames:
- `DB_HOST=postgres`
- `KAFKA_BROKERS=kafka:29092`

### 3. Установите зависимости

Если зависимости еще не установлены:

```bash
# Из корня проекта
npm install

# Или из директории booking-service
npm install
```

### 4. Запустите Booking Service

#### Режим разработки (с hot-reload):

```bash
# Из корня проекта
npm run start:booking

# Или из директории booking-service
npm run start:dev
```

#### Production режим:

```bash
# Сначала соберите проект
npm run build

# Затем запустите
npm run start:prod
```

### 5. Проверьте работу сервиса


## Как это работает

1. **API Service** создает бронь и публикует событие `booking.created` в Kafka
2. **Booking Service** получает событие из Kafka
3. Booking Service обновляет статус брони на `CHECKING_AVAILABILITY`
4. Проверяется доступность столика (нет ли конфликтующих броней)
5. Статус обновляется на `CONFIRMED` или `REJECTED`
6. Публикуется событие `booking.status.updated` в Kafka

## Логика проверки доступности

Booking Service проверяет наличие конфликтующих броней по правилу:
- Если существует бронь с тем же `restaurantId`, `date` и `time` со статусом `CONFIRMED` → статус `REJECTED`
- Иначе → статус `CONFIRMED`

## Переменные окружения

Основные переменные окружения (см. `.env.example`):

- `PORT` - порт приложения (по умолчанию 3001)
- `NODE_ENV` - окружение (development/production)
- `DB_HOST` - хост PostgreSQL (по умолчанию postgres)
- `DB_PORT` - порт PostgreSQL (по умолчанию 5432)
- `DB_DATABASE` - имя базы данных (booking_service)
- `KAFKA_BROKERS` - адреса Kafka брокеров (kafka:29092)
- `KAFKA_CONSUMER_GROUP_ID` - ID группы consumer (booking-service-consumer)
- `KAFKA_TOPIC_BOOKING_CREATED` - топик для событий создания брони (booking.created)
- `KAFKA_TOPIC_BOOKING_STATUS_UPDATED` - топик для событий обновления статуса (booking.status.updated)


## Логирование

### Структурированное логирование

Booking Service использует структурированное логирование на основе Pino:
- **JSON формат** в production (настраивается через `LOG_FORMAT=json`)
- **Pretty формат** в development (настраивается через `LOG_FORMAT=pretty`)
- **Обязательные поля** во всех логах:
  - `service` - название сервиса (booking-service)
  - `bookingId` - ID брони
  - `correlationId` - Correlation ID для отслеживания событий
  - `eventType` - тип события (kafka.event, booking.created, и т.д.)
  - `status` - статус брони
  - `timestamp` - ISO timestamp

### Типы логирования

1. **Kafka события** - логирование получения и обработки событий:
   - Consumer: получение сообщений, обработка, retry, ошибки
   - Producer: отправка событий обновления статуса

2. **Бронирования** - логирование операций с бронями:
   - Обработка событий создания, проверка доступности, обновление статуса
   - Идемпотентность обработки дублирующих событий

3. **DLQ** - логирование отправки неудачных сообщений в Dead Letter Queue:
   - Сообщения, которые не удалось обработать после N попыток

### Примеры логов

```json
{
  "level": "info",
  "time": "2025-11-27T17:30:00.000Z",
  "service": "booking-service",
  "bookingId": "123e4567-e89b-12d3-a456-426614174000",
  "correlationId": "test-123",
  "eventType": "booking.created",
  "status": "CONFIRMED",
  "msg": "Booking processed successfully"
}
```
