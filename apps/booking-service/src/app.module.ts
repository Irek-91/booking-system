import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { KafkaModule } from './infrastructure/kafka/kafka.module';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { BookingsModule } from './bookings/bookings.module';
import { HealthModule } from './presentation/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      ignoreEnvFile: false,
    }),
    DatabaseModule,
    KafkaModule,
    LoggingModule,
    BookingsModule,
    HealthModule,
  ],
})
export class AppModule {}
