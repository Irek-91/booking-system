import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import {
  BookingStatusUpdatedEvent,
  BookingStatus,
} from '@booking-system/shared';
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
      clientId: this.configService.get<string>(
        'KAFKA_CLIENT_ID',
        'booking-service',
      ),
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

  async publishBookingStatusUpdated(
    event: BookingStatusUpdatedEvent,
  ): Promise<void> {
    const topic = this.configService.get<string>(
      'KAFKA_TOPIC_BOOKING_STATUS_UPDATED',
      'booking.status.updated',
    );

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.bookingId,
            value: JSON.stringify({
              bookingId: event.bookingId,
              status: event.status,
            }),
            headers: {
              'correlation-id': event.correlationId || '',
            },
          },
        ],
      });

      this.logger.logKafkaEvent('info', 'Published booking.status.updated event', {
        eventType: 'booking.status.updated',
        bookingId: event.bookingId,
        status: event.status,
        correlationId: event.correlationId,
        topic,
      });
    } catch (error) {
      this.logger.logKafkaEvent('error', 'Failed to publish booking.status.updated event', {
        eventType: 'booking.status.updated',
        bookingId: event.bookingId,
        status: event.status,
        correlationId: event.correlationId,
        topic,
        error: error.message,
      });
      throw error;
    }
  }
}

