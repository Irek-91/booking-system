import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { BookingStatus } from '../src/domain/entities/booking-status.enum';
import { BookingDuration } from '../src/domain/value-objects/booking-duration.enum';

describe('Booking Flow (e2e)', () => {
  let app: INestApplication<App>;
  const testRestaurantId = '123e4567-e89b-12d3-a456-426614174000';
  const correlationId = `e2e-test-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Добавляем ValidationPipe как в main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
          const errorsMessages = errors.map((error) => {
            const constraints = error.constraints || {};
            const firstConstraint = Object.values(constraints)[0] as string;
            return {
              message: firstConstraint || 'Validation failed',
              field: error.property || '',
            };
          });
          return new BadRequestException({
            message: errorsMessages,
          });
        },
      }),
    );
    
    await app.init();
  });

  afterAll(async () => {
    // Даем время на завершение всех асинхронных операций (Kafka, Outbox)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await app.close();
  });

  describe('End-to-End Booking Flow', () => {
    it('should create booking, process it asynchronously, and update status', async () => {
      // Шаг 1: Создание брони через API
      const createBookingDto = {
        restaurantId: testRestaurantId,
        date: '2025-12-25',
        time: '19:00',
        guests: 4,
        duration: BookingDuration.TWO_HOURS,
      };

      const createResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('X-Correlation-Id', correlationId)
        .set('Idempotency-Key', `e2e-${Date.now()}`)
        .send(createBookingDto)
        .expect(201);

      const bookingId = createResponse.body.id;

      // Проверяем, что бронь создана со статусом CREATED и без tableId
      expect(createResponse.body).toMatchObject({
        id: bookingId,
        restaurantId: testRestaurantId,
        date: expect.any(String),
        time: '19:00',
        guests: 4,
        duration: BookingDuration.TWO_HOURS,
        status: BookingStatus.CREATED,
        tableId: null, // tableId должен быть null при создании
      });

      // Шаг 2: Ждем обработки события в Booking Service (максимум 15 секунд)
      let finalStatus: string = BookingStatus.CREATED;
      let attempts = 0;
      const maxAttempts = 30; // 30 попыток по 500ms = 15 секунд

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Ждем 500ms

        const getResponse = await request(app.getHttpServer())
          .get(`/bookings/${bookingId}`)
          .set('X-Correlation-Id', correlationId)
          .expect(200);

        finalStatus = getResponse.body.status;

        // Если статус изменился на CONFIRMED или REJECTED, значит обработка завершена
        if (
          finalStatus === BookingStatus.CONFIRMED ||
          finalStatus === BookingStatus.REJECTED
        ) {
          break;
        }

        attempts++;
      }

      // Шаг 3: Проверяем финальный статус
      const finalResponse = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('X-Correlation-Id', correlationId)
        .expect(200);

      // Проверяем, что статус изменился (Booking Service должен быть запущен)
      // Если статус остался CREATED, значит Booking Service не обработал событие
      if (finalStatus === BookingStatus.CREATED) {
        throw new Error(
          'Booking Service не обработал событие. Статус остался CREATED. ' +
          'Убедитесь, что Booking Service запущен и подключен к Kafka. ' +
          'Для полного E2E теста запустите: cd infrastructure && docker-compose up -d',
        );
      }

      // Booking Service обработал событие - проверяем финальный статус
      expect(finalStatus).toBeDefined();
      expect([
        BookingStatus.CONFIRMED,
        BookingStatus.REJECTED,
      ]).toContain(finalStatus);

      expect(finalResponse.body).toMatchObject({
        id: bookingId,
        restaurantId: testRestaurantId,
        status: finalStatus,
      });

      // Если статус CONFIRMED, должен быть назначен tableId
      if (finalStatus === BookingStatus.CONFIRMED) {
        expect(finalResponse.body.tableId).toBeTruthy();
        expect(typeof finalResponse.body.tableId).toBe('string');
      }

      // Проверяем, что статус изменился
      expect(finalResponse.body.status).not.toBe(BookingStatus.CREATED);
    }, 20000); // Увеличиваем timeout до 20 секунд для учета времени обработки

    it('should handle idempotency correctly', async () => {
      const idempotencyKey = `idempotency-test-${Date.now()}`;
      const createBookingDto = {
        restaurantId: testRestaurantId,
        date: '2025-12-26',
        time: '20:00',
        guests: 2,
        duration: BookingDuration.ONE_HOUR,
      };

      // Первый запрос
      const firstResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('X-Correlation-Id', correlationId)
        .set('Idempotency-Key', idempotencyKey)
        .send(createBookingDto)
        .expect(201);

      const firstBookingId = firstResponse.body.id;

      // Второй запрос с тем же Idempotency-Key
      const secondResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('X-Correlation-Id', correlationId)
        .set('Idempotency-Key', idempotencyKey)
        .send(createBookingDto)
        .expect(201);

      // Должна вернуться та же бронь
      expect(secondResponse.body.id).toBe(firstBookingId);
    });

    it('should return 404 for non-existent booking', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/bookings/${nonExistentId}`)
        .set('X-Correlation-Id', correlationId)
        .expect(404);
    });

    it('should validate booking creation input', async () => {
      // Тест с невалидными данными - валидация происходит на уровне DTO
      const invalidDto = {
        restaurantId: 'invalid-uuid',
        date: 'invalid-date',
        time: '25:00', // Невалидное время
        guests: -1, // Отрицательное количество гостей
        duration: 999, // Невалидная длительность
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('X-Correlation-Id', correlationId)
        .send(invalidDto)
        .expect(400);

      // Проверяем формат ошибки валидации
      expect(response.body).toHaveProperty('errorsMessages');
      expect(Array.isArray(response.body.errorsMessages)).toBe(true);
      expect(response.body.errorsMessages.length).toBeGreaterThan(0);
    });
  });
});

