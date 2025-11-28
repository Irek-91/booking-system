import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { StructuredLoggerService } from './infrastructure/logging/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const logger = app.get(StructuredLoggerService);
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log('Booking Service started', {
    port,
    url: `http://localhost:${port}`,
  });
  logger.log('Waiting for Kafka messages...');
}
bootstrap();
