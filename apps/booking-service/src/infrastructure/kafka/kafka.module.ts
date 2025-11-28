import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BookingsModule } from '../../bookings/bookings.module';
import { KafkaConsumerService } from './kafka-consumer.service';
import { KafkaProducerService } from './kafka-producer.service';
import { DLQService } from './dlq.service';
import { BookingCreatedHandler } from '../../application/handlers/booking-created.handler';

@Module({
  imports: [ConfigModule, BookingsModule],
  providers: [
    KafkaConsumerService,
    KafkaProducerService,
    DLQService,
    BookingCreatedHandler,
  ],
  exports: [KafkaProducerService],
})
export class KafkaModule {}

