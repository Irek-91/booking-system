# API Service

API Service для системы бронирования столиков в ресторанах.

## Swagger документация

После запуска сервиса, Swagger документация доступна по адресу:

**http://localhost:3000/api**

Здесь вы можете:
- Просмотреть все доступные endpoints
- Протестировать API прямо в браузере
- Изучить схемы запросов и ответов
- Просмотреть примеры использования

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

Если инфраструктура не запущена:

```bash
cd ../../infrastructure
cp .env.example .env
docker-compose up -d
```

### 2. Настройте переменные окружения

#### Для локального запуска:

Если вы запускаете API Service локально (не в Docker), используйте `localhost` для подключения к сервисам:

```bash
# Используйте .env.local или обновите .env
cp .env.local .env
```

Или вручную обновите `.env` файл, заменив Docker hostnames на `localhost`:
- `DB_HOST=localhost` (вместо `postgres`)
- `REDIS_HOST=localhost` (вместо `redis`)
- `KAFKA_BROKERS=localhost:9092` (вместо `kafka:29092`)

#### Для запуска в Docker:

Если API Service будет запускаться в Docker контейнере, используйте Docker hostnames:
- `DB_HOST=postgres`
- `REDIS_HOST=redis`
- `KAFKA_BROKERS=kafka:29092`

### 3. Установите зависимости

Если зависимости еще не установлены:

```bash
# Из корня проекта
npm install

# Или из директории api-service
npm install
```

### 4. Запустите API Service

#### Режим разработки (с hot-reload):

```bash
# Из корня проекта
npm run start:api

# Или из директории api-service
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

API Service будет доступен на `http://localhost:3000`

Проверьте health endpoint (если добавлен) или создайте тестовую бронь:

```bash
# Создание новой брони
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-123" \
  -d '{
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "date": "2025-12-01",
    "time": "19:00",
    "guests": 4,
    "duration": 2
  }'
```

Ответ будет содержать созданную бронь с ID. Используйте этот ID для получения брони:

```bash
# Получение брони по ID
curl http://localhost:3000/bookings/91e939e9-0ab6-4bfa-a22e-768d1e49c436 \
  -H "X-Correlation-Id: test-123"
```

**Примеры бронирования на разное время:**

Бронь на 1 час:
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-123" \
  -d '{
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "date": "2025-12-01",
    "time": "19:00",
    "guests": 2,
    "duration": 1
  }'
```

Бронь на 3 часа:
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-123" \
  -d '{
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "date": "2025-12-01",
    "time": "18:00",
    "guests": 6,
    "duration": 3
  }'
```

## Переменные окружения

Основные переменные окружения (см. `.env.example`):

- `PORT` - порт приложения (по умолчанию 3000)
- `NODE_ENV` - окружение (development/production)
- `DB_HOST` - хост PostgreSQL (по умолчанию postgres)
- `DB_PORT` - порт PostgreSQL (по умолчанию 5432)
- `DB_DATABASE` - имя базы данных (api_service)
- `KAFKA_BROKERS` - адреса Kafka брокеров (kafka:29092)
- `REDIS_HOST` - хост Redis (по умолчанию redis)
- `REDIS_PORT` - порт Redis (по умолчанию 6379)
- `REDIS_PASSWORD` - пароль Redis
- `IDEMPOTENCY_TTL` - время жизни ключей идемпотентности в секундах (по умолчанию 86400 = 24 часа)
- `OUTBOX_PROCESSING_INTERVAL_MS` - интервал обработки outbox events в миллисекундах (по умолчанию 5000 = 5 секунд)
- `OUTBOX_MAX_RETRIES` - максимальное количество попыток повтора отправки события в Kafka (по умолчанию 3)
- `LOG_LEVEL` - уровень логирования (trace, debug, info, warn, error, fatal) (по умолчанию info)
- `LOG_FORMAT` - формат логов (json или pretty) (по умолчанию json)
- `SERVICE_NAME` - имя сервиса для логирования (по умолчанию api-service)

## API Endpoints

### POST /bookings
Создание новой брони.

**Идемпотентность:** Для обеспечения идемпотентности запросов используйте заголовок `Idempotency-Key`. При повторном запросе с тем же ключом и телом запроса будет возвращен сохраненный результат без повторного создания брони.

**Параметры запроса:**
- `restaurantId` (string, UUID) - ID ресторана (обязательно)
- `date` (string, YYYY-MM-DD) - дата бронирования (обязательно)
- `time` (string, HH:MM) - время начала бронирования в 24-часовом формате (обязательно)
- `guests` (number, min: 1) - количество гостей (обязательно)
- `duration` (number, enum: 1, 2, 3, 4) - длительность бронирования в часах (обязательно)

**Пример запроса:**

```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -H "X-Correlation-Id: test-123" \
  -H "Idempotency-Key: unique-request-id-12345" \
  -d '{
    "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
    "date": "2025-12-01",
    "time": "19:00",
    "guests": 4,
    "duration": 2
  }'
```

**Пример успешного ответа (201 Created):**

```json
{
  "id": "91e939e9-0ab6-4bfa-a22e-768d1e49c436",
  "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-12-01T00:00:00.000Z",
  "time": "19:00",
  "guests": 4,
  "duration": 2,
  "tableId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "CREATED",
  "createdAt": "2025-11-27T17:30:00.000Z",
  "updatedAt": "2025-11-27T17:30:00.000Z"
}
```

**Примечание:** Система автоматически выбирает свободный стол с достаточной вместимостью для указанного количества гостей. Стол закрепляется за бронью (`tableId`).

**Примечания:**
- `Idempotency-Key` должен быть уникальным для каждого уникального запроса
- Ключи идемпотентности хранятся в Redis с TTL (по умолчанию 24 часа)
- При повторном запросе с тем же ключом, но другим телом запроса будет возвращена ошибка
- `duration` определяет, на сколько часов бронируется стол (1, 2, 3 или 4 часа)
- Система автоматически проверяет доступность стола на указанное время с учетом длительности брони
- Если стол уже забронирован на пересекающееся время, бронь будет отклонена (статус `REJECTED`)

### GET /bookings/:id
Получение брони по ID.

**Пример запроса:**

```bash
curl http://localhost:3000/bookings/91e939e9-0ab6-4bfa-a22e-768d1e49c436 \
  -H "X-Correlation-Id: test-123"
```

**Пример успешного ответа (200 OK):**

```json
{
  "id": "91e939e9-0ab6-4bfa-a22e-768d1e49c436",
  "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-12-01T00:00:00.000Z",
  "time": "19:00",
  "guests": 4,
  "duration": 2,
  "tableId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "CONFIRMED",
  "createdAt": "2025-11-27T17:30:00.000Z",
  "updatedAt": "2025-11-27T17:30:05.000Z"
}
```

**Возможные статусы брони:**
- `CREATED` - бронь создана, ожидает проверки доступности
- `CHECKING_AVAILABILITY` - идет проверка доступности стола
- `CONFIRMED` - бронь подтверждена, стол свободен на указанное время
- `REJECTED` - бронь отклонена, стол занят на пересекающееся время

**Формат поля `duration`:**
- `1` - бронь на 1 час
- `2` - бронь на 2 часа
- `3` - бронь на 3 часа
- `4` - бронь на 4 часа

**Пример ответа с ошибкой валидации (400 Bad Request):**

```json
{
  "errorsMessages": [
    {
      "message": "restaurantId must be a valid UUID",
      "field": "restaurantId"
    },
    {
      "message": "duration must be 1, 2, 3, or 4 hours",
      "field": "duration"
    },
    {
      "message": "time must be in HH:MM format (24-hour)",
      "field": "time"
    }
  ],
  "correlationId": "e696626b-b096-4639-b5f2-8504b26742f3"
}
```

**Пример ответа при конфликте времени (бронь будет отклонена):**

После создания брони, если выбранный стол занят на пересекающееся время, статус будет обновлен на `REJECTED`:

```json
{
  "id": "91e939e9-0ab6-4bfa-a22e-768d1e49c436",
  "restaurantId": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-12-01T00:00:00.000Z",
  "time": "20:00",
  "guests": 4,
  "duration": 2,
  "tableId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "REJECTED",
  "createdAt": "2025-11-27T17:30:00.000Z",
  "updatedAt": "2025-11-27T17:30:05.000Z"
}
```

**Пример ответа при отсутствии свободных столов (404 Not Found):**

Если нет свободных столов с достаточной вместимостью на указанное время:

```json
{
  "errorsMessages": [
    {
      "message": "No available tables found for the specified time",
      "field": "time"
    }
  ],
  "correlationId": "e696626b-b096-4639-b5f2-8504b26742f3"
}
```

## Структура базы данных

**Тестовые данные:**
При выполнении миграции автоматически создаются тестовые данные для трех ресторанов:

- **Ресторан 1** (`123e4567-e89b-12d3-a456-426614174000`): 10 столов (2×2 места, 4×4 места, 2×6 мест, 2×8 мест)
- **Ресторан 2** (`223e4567-e89b-12d3-a456-426614174001`): 4 стола (2×4 места, 2×6 мест)
- **Ресторан 3** (`323e4567-e89b-12d3-a456-426614174002`): 2 стола (2×2 места)

Эти данные используются в примерах API запросов и позволяют сразу тестировать систему без дополнительной настройки.

## Структура проекта

Проект следует принципам Clean Architecture:

- `domain/` - доменные сущности и value objects
- `application/` - use cases (CQRS команды и запросы)
- `infrastructure/` - реализация репозиториев, Kafka, Redis
- `presentation/` - контроллеры, DTO, middleware

## Бизнес-логика

### Система столов и автоматический выбор
Каждый ресторан имеет фиксированное количество столов с определенной вместимостью (количество мест).

**Процесс бронирования:**
1. При создании брони система автоматически выбирает свободный стол:
   - Ищет все столы ресторана с вместимостью >= количества гостей
   - Проверяет доступность каждого стола на указанное время с учетом `duration`
   - Выбирает первый свободный стол
   - Закрепляет стол за бронь (`tableId`)

2. Проверка доступности:
   - Система вычисляет временной интервал: `startTime` до `startTime + duration`
   - Проверяет все подтвержденные брони для выбранного стола на указанную дату
   - Если найдено пересечение временных интервалов для этого стола, бронь отклоняется (`REJECTED`)
   - Если стол свободен на это время, бронь подтверждается (`CONFIRMED`)

3. Если свободных столов нет:
   - Бронь не создается, возвращается ошибка 404 с сообщением "No available tables found for the specified time"

## Логирование

### Структурированное логирование

API Service использует структурированное логирование на основе Pino:
- **JSON формат** в production (настраивается через `LOG_FORMAT=json`)
- **Pretty формат** в development (настраивается через `LOG_FORMAT=pretty`)
- **Обязательные поля** во всех логах:
  - `service` - название сервиса (api-service)
  - `bookingId` - ID брони (если применимо)
  - `correlationId` - Correlation ID для отслеживания запросов
  - `eventType` - тип события (kafka.event, booking.created, и т.д.)
  - `status` - статус брони (если применимо)
  - `timestamp` - ISO timestamp

### Типы логирования

1. **HTTP запросы** - автоматически логируются через `HttpLoggerInterceptor`:
   - Метод, путь, статус код, время выполнения
   - Correlation ID из заголовка `X-Correlation-Id`

2. **Kafka события** - логирование отправки и получения событий:
   - Producer: подключение, отправка событий, ошибки
   - Consumer: получение сообщений, обработка, ошибки

3. **Бронирования** - логирование операций с бронями:
   - Создание, обновление статуса, проверка доступности

4. **Outbox events** - логирование обработки outbox событий:
   - Обработка событий, отправка в Kafka, retry, ошибки

### Примеры логов

```json
{
  "level": "info",
  "time": "2025-11-27T17:30:00.000Z",
  "service": "api-service",
  "bookingId": "123e4567-e89b-12d3-a456-426614174000",
  "correlationId": "test-123",
  "eventType": "booking.created",
  "status": "CREATED",
  "msg": "Booking created successfully"
}
```
