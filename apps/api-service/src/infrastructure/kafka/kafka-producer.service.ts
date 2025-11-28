import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { BookingCreatedEvent } from '@booking-system/shared';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
  ) {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'kafka:29092')
      .split(',');

    this.kafka = new Kafka({
      clientId: this.configService.get<string>('KAFKA_CLIENT_ID', 'api-service'),
      brokers,
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.logKafkaEvent('info', 'Kafka producer connected', {
      eventType: 'kafka.producer.connected',
    });
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.logKafkaEvent('info', 'Kafka producer disconnected', {
      eventType: 'kafka.producer.disconnected',
    });
  }

  async publishBookingCreated(event: BookingCreatedEvent): Promise<void> {
    const topic = 'booking.created';
    
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.bookingId,
            value: JSON.stringify(event),
            headers: {
              'correlation-id': event.correlationId || '',
            },
          },
        ],
      });

      this.logger.logKafkaEvent('info', 'Published booking.created event', {
        eventType: 'booking.created',
        bookingId: event.bookingId,
        correlationId: event.correlationId,
        topic,
      });
    } catch (error) {
      this.logger.logKafkaEvent('error', 'Failed to publish booking.created event', {
        eventType: 'booking.created',
        bookingId: event.bookingId,
        correlationId: event.correlationId,
        topic,
        error: error.message,
      });
      throw error;
    }
  }
}

