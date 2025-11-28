import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BookingsModule } from '../../bookings/bookings.module';
import { KafkaProducerService } from './kafka-producer.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { DLQService } from './dlq.service';
import { BookingStatusUpdatedHandler } from '../../application/handlers/booking-status-updated.handler';

@Global()
@Module({
  imports: [ConfigModule, BookingsModule],
  providers: [
    KafkaProducerService,
    KafkaConsumerService,
    DLQService,
    BookingStatusUpdatedHandler,
  ],
  exports: [KafkaProducerService],
})
export class KafkaModule {}

