# Docker и деплой

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose установлены
- Порты 3000, 3001, 5432, 2181, 9092, 6379 свободны (или измените в `.env`)

### Запуск всей системы

1. Перейдите в директорию `infrastructure`:
```bash
cd infrastructure
```

2. Скопируйте `.env.example` в `.env` (если еще не сделано):
```bash
cp .env.example .env
```

3. Запустите всю систему одной командой:
```bash
docker-compose up -d
```

Эта команда запустит:
- PostgreSQL с базами данных для обоих сервисов
- Zookeeper и Kafka
- Redis
- API Service (порт 3000)
- Booking Service (порт 3001)

4. Проверьте статус всех сервисов:
```bash
docker-compose ps
```

Все сервисы должны быть в статусе `Up` и `healthy`.

### Проверка работы

После запуска проверьте health check endpoints:

```bash
# API Service
curl http://localhost:3000/health

# Booking Service
curl http://localhost:3001/health
```

### Остановка системы

```bash
docker-compose down
```

Для удаления всех данных (volumes):
```bash
docker-compose down -v
```

## Структура Docker образов

### API Service

- **Dockerfile**: `apps/api-service/Dockerfile`
- **Multi-stage build**: оптимизированный размер образа
- **Health check**: `/health` endpoint
- **Миграции**: запускаются автоматически при старте контейнера

### Booking Service

- **Dockerfile**: `apps/booking-service/Dockerfile`
- **Multi-stage build**: оптимизированный размер образа
- **Health check**: `/health` endpoint
- **Миграции**: запускаются автоматически при старте контейнера

## Переменные окружения

Все переменные окружения настраиваются в `infrastructure/.env`. Скопируйте `infrastructure/.env.example` в `infrastructure/.env` и при необходимости измените значения.

### Инфраструктура

- `POSTGRES_USER` - пользователь PostgreSQL (по умолчанию: `postgres`)
- `POSTGRES_PASSWORD` - пароль PostgreSQL (по умолчанию: `postgres`)
- `POSTGRES_DB` - база данных для инициализации (по умолчанию: `api_service`)
- `POSTGRES_PORT` - порт PostgreSQL (по умолчанию: `5432`)
- `ZOOKEEPER_PORT` - порт Zookeeper (по умолчанию: `2181`)
- `KAFKA_PORT` - внешний порт Kafka (по умолчанию: `9092`)
- `KAFKA_PORT_INTERNAL` - внутренний порт Kafka (по умолчанию: `29092`)
- `REDIS_PORT` - порт Redis (по умолчанию: `6379`)
- `REDIS_PASSWORD` - пароль Redis (по умолчанию: `redis`)

### Сервисы

- `API_SERVICE_PORT` - порт API Service (по умолчанию: `3000`)
- `BOOKING_SERVICE_PORT` - порт Booking Service (по умолчанию: `3001`)

### API Service (специфичные)

- `IDEMPOTENCY_TTL` - время жизни ключей идемпотентности в секундах (по умолчанию: `86400` = 24 часа)
- `OUTBOX_PROCESSING_INTERVAL_MS` - интервал обработки outbox events в миллисекундах (по умолчанию: `5000` = 5 секунд)
- `OUTBOX_MAX_RETRIES` - максимальное количество попыток повтора отправки события в Kafka (по умолчанию: `3`)

**Примечание**: Переменные из `infrastructure/.env` используются в `docker-compose.yml` для настройки всех сервисов. Для локальной разработки используйте `.env` файлы в `apps/api-service/` и `apps/booking-service/`.

## Зависимости между сервисами

Сервисы запускаются в следующем порядке:

1. **PostgreSQL** - база данных
2. **Zookeeper** - координатор для Kafka
3. **Kafka** - зависит от Zookeeper
4. **Redis** - кэш для идемпотентности
5. **API Service** - зависит от PostgreSQL, Kafka, Redis
6. **Booking Service** - зависит от PostgreSQL, Kafka

Все зависимости настроены через `depends_on` с условием `service_healthy`.

## Логи

Просмотр логов всех сервисов:
```bash
docker-compose logs -f
```

Просмотр логов конкретного сервиса:
```bash
docker-compose logs -f api-service
docker-compose logs -f booking-service
```

## Пересборка образов

Если вы изменили код и хотите пересобрать образы:

```bash
docker-compose build
docker-compose up -d
```

Или пересобрать конкретный сервис:
```bash
docker-compose build api-service
docker-compose up -d api-service
```

## Миграции базы данных

Миграции запускаются автоматически при старте контейнеров (если `NODE_ENV=production`).

Для ручного запуска миграций:

```bash
# API Service
docker-compose exec api-service npm run typeorm migration:run

# Booking Service
docker-compose exec booking-service npm run typeorm migration:run
```
