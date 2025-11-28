import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { KafkaModule } from './infrastructure/kafka/kafka.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { OutboxModule } from './infrastructure/outbox/outbox.module';
import { IdempotencyModule } from './infrastructure/idempotency/idempotency.module';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { BookingsModule } from './bookings/bookings.module';
import { HealthModule } from './presentation/health/health.module';
import { CorrelationIdMiddleware } from './presentation/filters/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      ignoreEnvFile: false,
    }),
    DatabaseModule,
    KafkaModule,
    RedisModule,
    OutboxModule,
    IdempotencyModule,
    LoggingModule,
    BookingsModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .exclude('api', 'api-json', 'api-json/(.*)')
      .forRoutes('*');
  }
}
