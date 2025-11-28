# End-to-End Тестирование

## Обзор

E2E тесты проверяют работу всей системы от создания брони через API до асинхронной обработки в Booking Service.

## Что проверяется

### Основной flow:
1. Создание брони через `POST /bookings`
2. Проверка начального статуса `CREATED` и `tableId = null`
3. Ожидание асинхронной обработки события в Booking Service
4. Проверка обновления статуса на `CONFIRMED` или `REJECTED`
5. Проверка назначения `tableId` при подтверждении

### Дополнительные проверки:
- Идемпотентность запросов
- Валидация входных данных
- Обработка несуществующих броней (404)

## Запуск тестов

```bash
# Из корня проекта
npm run test:e2e

# Или напрямую из API Service
cd apps/api-service
npm run test:e2e
```

## Требования

**ВАЖНО:** Для полной проверки E2E flow необходимо запустить оба сервиса!

Для запуска e2e тестов необходимо:

1. **Запущенные сервисы через docker-compose:**
   ```bash
   cd infrastructure
   docker-compose up -d
   ```
   
   Должны быть запущены:
   - PostgreSQL с базами `api_service` и `booking_service`
   - Kafka и Zookeeper
   - Redis (для идемпотентности)
   - **API Service (порт 3000)** - запускается в тесте
   - **Booking Service (порт 3001)** - должен быть запущен отдельно!

2. **Тестовые данные:**
   - Ресторан с ID `123e4567-e89b-12d3-a456-426614174000`
   - Столы в базе данных `booking_service` (создаются через миграции)

**Примечание:** Тест запускает только API Service локально. Booking Service должен быть запущен отдельно через docker-compose, иначе статус брони не будет обновляться.

## Структура тестов

### Jest тесты (`apps/api-service/test/booking-flow.e2e-spec.ts`)

- `should create booking, process it asynchronously, and update status` - основной flow
- `should handle idempotency correctly` - проверка идемпотентности
- `should return 404 for non-existent booking` - обработка ошибок
- `should validate booking creation input` - валидация данных

## Ожидаемое поведение

### Успешный сценарий:

1. **Создание брони:**
   ```json
   {
     "id": "...",
     "status": "CREATED",
     "tableId": null
   }
   ```

2. **После обработки (CONFIRMED):**
   ```json
   {
     "id": "...",
     "status": "CONFIRMED",
     "tableId": "uuid-стола"
   }
   ```

3. **После обработки (REJECTED):**
   ```json
   {
     "id": "...",
     "status": "REJECTED",
     "tableId": null
   }
   ```

### Временные рамки

- Создание брони: < 1 секунды
- Обработка события: 1-5 секунд (зависит от Kafka и Booking Service)
- Timeout теста: 15 секунд


