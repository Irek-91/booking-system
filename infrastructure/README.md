# Infrastructure

Docker Compose конфигурация для инфраструктурных сервисов Booking System.

## Сервисы

- **PostgreSQL** - база данных с отдельными базами данных для каждого микросервиса:
  - `api_service` - база данных для API Service
  - `booking_service` - база данных для Booking Service
  - Базы данных создаются автоматически при первом запуске через `init-db.sql`
- **Zookeeper** - координатор для Kafka
- **Kafka** - брокер сообщений для event-driven архитектуры
- **Redis** - кэш для идемпотентности команд API Service

## Быстрый старт

### Предварительные требования

- Docker и Docker Compose установлены
- Порты 5432, 2181, 9092, 6379 свободны (или измените в `.env`)

### Запуск инфраструктуры

1. Скопируйте `.env.example` в `.env`:
```bash
cp .env.example .env
```

2. При необходимости отредактируйте `.env` файл с вашими настройками

3. Запустите все сервисы:
```bash
docker-compose up -d
```

4. Проверьте статус сервисов:
```bash
docker-compose ps
```

### Остановка инфраструктуры

```bash
docker-compose down
```

Для удаления всех данных (volumes):
```bash
docker-compose down -v
```

## Подключение к сервисам

### PostgreSQL

База данных содержит две отдельные базы данных:
- `api_service` - для API Service
- `booking_service` - для Booking Service

```bash
# Подключение к базе данных API Service
docker exec -it booking-system-postgres psql -U postgres -d api_service
# Или локально
psql -h localhost -p 5432 -U postgres -d api_service

# Подключение к базе данных Booking Service
docker exec -it booking-system-postgres psql -U postgres -d booking_service
# Или локально
psql -h localhost -p 5432 -U postgres -d booking_service
```

Пароль по умолчанию: `postgres`

### Kafka

Kafka доступна на `localhost:9092` для приложений вне Docker сети.

Внутри Docker сети используйте `kafka:29092`.

### Redis

```bash
# Подключение через redis-cli
docker exec -it booking-system-redis redis-cli -a redis

# Или локально (если redis-cli установлен)
redis-cli -h localhost -p 6379 -a redis
```

## Сетевые алиасы

Все сервисы находятся в сети `booking-network` и доступны по следующим hostname:

- `postgres` - PostgreSQL
- `zookeeper` - Zookeeper
- `kafka` - Kafka (внутренний порт 29092)
- `redis` - Redis

## Volumes

Данные сохраняются в именованных volumes:

- `postgres_data` - данные PostgreSQL
- `zookeeper_data` - данные Zookeeper
- `zookeeper_logs` - логи Zookeeper
- `kafka_data` - данные Kafka
- `redis_data` - данные Redis

## Переменные окружения

См. `.env.example` для списка всех доступных переменных окружения.

### Важно о PostgreSQL

Переменная `POSTGRES_DB` в `.env` используется только для инициализации контейнера PostgreSQL. 
Реальные базы данных для микросервисов (`api_service` и `booking_service`) создаются автоматически 
при первом запуске через скрипт `init-db.sql`. Каждый микросервис подключается к своей отдельной базе данных.

