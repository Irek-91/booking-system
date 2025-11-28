# Booking System

Система бронирования столиков в ресторанах на основе event-driven архитектуры.

## Архитектура

Проект состоит из двух микросервисов:
- **API Service** - HTTP API для создания и получения броней
- **Booking Service** - обработка событий и проверка доступности столиков

## Технологии

- **Backend**: NestJS
- **База данных**: PostgreSQL
- **ORM**: TypeORM
- **Сообщения**: Kafka
- **Кэш/Идемпотентность**: Redis
- **Инфраструктура**: Docker Compose

## Структура проекта

```
booking-system/
├── apps/
│   ├── api-service/      # API Service микросервис
│   └── booking-service/  # Booking Service микросервис
├── packages/
│   └── shared/           # Общие типы событий Kafka
├── infrastructure/        # Docker Compose конфигурация
└── docs/                  # Документация
```

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose
- Node.js 18+ и npm (для локальной разработки)

### Запуск через Docker Compose (рекомендуется)

Самый простой способ запустить всю систему:

```bash
cd infrastructure
cp .env.example .env  # если еще не создан
docker-compose up -d
```

Эта команда запустит всю систему:
- PostgreSQL с базами данных для обоих сервисов
- Zookeeper и Kafka
- Redis
- **API Service** (порт 3000)
- **Booking Service** (порт 3001)

Проверьте статус:
```bash
docker-compose ps
```

Все сервисы должны быть в статусе `Up` и `healthy`.

## API Документация

После запуска API Service, Swagger документация доступна по адресу:

**http://localhost:3000/api**

Здесь вы можете:
- Просмотреть все доступные endpoints
- Протестировать API прямо в браузере
- Изучить схемы запросов и ответов
- Просмотреть примеры использования

## Документация

Подробная документация находится в директории `docs/`:

### Основная документация
- **[KAFKA_EVENTS.md](./docs/KAFKA_EVENTS.md)** - формат событий Kafka, структура сообщений, обработка событий

### Операционная документация
- **[DOCKER.md](./infrastructure/DOCKER.md)** - Docker и деплой, запуск через Docker Compose

### Event-Driven Architecture

Коммуникация между микросервисами происходит через Kafka события:
- `booking.created` - создание новой брони
- `booking.status.updated` - обновление статуса брони

### Transactional Outbox Pattern

API Service использует Transactional Outbox Pattern для гарантированной доставки событий в Kafka.

### Идемпотентность

Все операции идемпотентны через заголовок `Idempotency-Key` и Redis.

## Основные возможности

-  Создание броней через REST API
-  Автоматический выбор свободного стола
-  Проверка доступности столов с учетом длительности брони
-  Асинхронная обработка через Kafka
-  Идемпотентность запросов
-  Transactional Outbox для надежной доставки событий
-  Структурированное логирование с Correlation ID
-  Swagger документация API
-  Docker Compose для простого развертывания

## Примеры использования

### Создание брони

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

### Получение информации о брони

```bash
curl http://localhost:3000/bookings/91e939e9-0ab6-4bfa-a22e-768d1e49c436 \
  -H "X-Correlation-Id: test-123"
```

### Проверка здоровья сервисов

```bash
curl http://localhost:3000/health  # API Service
curl http://localhost:3001/health  # Booking Service
```

### End-to-End тестирование

Для проверки работы всей системы end-to-end:

```bash
# Из корня проекта
npm run test:e2e

# Или напрямую из API Service
cd apps/api-service
npm run test:e2e
```

E2E тест проверяет:
1. Создание брони через API Service со статусом `CREATED` и `tableId = null`
2. Асинхронную обработку события в Booking Service
3. Обновление статуса брони на `CONFIRMED` или `REJECTED`
4. Назначение `tableId` при подтверждении
5. Идемпотентность запросов
6. Валидацию входных данных

Подробнее см. [docs/E2E_TESTING.md](./docs/E2E_TESTING.md)
