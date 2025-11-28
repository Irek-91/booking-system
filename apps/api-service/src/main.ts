import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { StructuredLoggerService } from './infrastructure/logging/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(StructuredLoggerService);

  // Swagger/OpenAPI документация
  const config = new DocumentBuilder()
    .setTitle('Booking System API')
    .setDescription('API для системы бронирования столиков в ресторанах')
    .setVersion('1.0')
    .addTag('bookings', 'Операции с бронями')
    .addTag('health', 'Проверка здоровья сервиса')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Correlation-Id',
        in: 'header',
        description: 'Correlation ID для отслеживания запросов',
      },
      'correlation-id',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Idempotency-Key',
        in: 'header',
        description: 'Ключ идемпотентности для предотвращения дублирования запросов',
      },
      'idempotency-key',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Глобальная валидация
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

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log('API Service started', {
    port,
    url: `http://localhost:${port}`,
    swaggerUrl: `http://localhost:${port}/api`,
  });
}
bootstrap();
