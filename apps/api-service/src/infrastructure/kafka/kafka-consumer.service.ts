import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { BookingStatusUpdatedHandler } from '../../application/handlers/booking-status-updated.handler';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;

  constructor(
    private readonly configService: ConfigService,
    private readonly bookingStatusUpdatedHandler: BookingStatusUpdatedHandler,
    private readonly logger: StructuredLoggerService,
  ) {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'kafka:29092')
      .split(',');

    this.kafka = new Kafka({
      clientId: this.configService.get<string>('KAFKA_CLIENT_ID', 'api-service'),
      brokers,
    });

    const groupId = this.configService.get<string>(
      'KAFKA_GROUP_ID',
      'api-service-group',
    );

    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxInFlightRequests: 1,
      retry: {
        retries: 3,
        initialRetryTime: 1000,
      },
      allowAutoTopicCreation: true,
    });
  }

  async onModuleInit() {
    await this.consumer.connect();
    this.logger.logKafkaEvent('info', 'Kafka consumer connected', {
      eventType: 'kafka.consumer.connected',
    });

    const topic = 'booking.status.updated';

    await this.consumer.subscribe({ topic, fromBeginning: false });
    this.logger.logKafkaEvent('info', `Subscribed to topic: ${topic}`, {
      eventType: 'kafka.consumer.subscribed',
      topic,
    });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    this.logger.logKafkaEvent('info', 'Kafka consumer disconnected', {
      eventType: 'kafka.consumer.disconnected',
    });
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const correlationId =
      message.headers?.['correlation-id']?.toString() || 'unknown';

    this.logger.logKafkaEvent('info', 'Received message from Kafka', {
      eventType: 'kafka.message.received',
      topic,
      partition,
      offset: message.offset,
      correlationId,
    });

    try {
      const value = message.value?.toString();
      if (!value) {
        this.logger.logKafkaEvent('warn', 'Message value is empty, skipping', {
          eventType: 'kafka.message.empty',
          topic,
          correlationId,
        });
        return;
      }

      const event = JSON.parse(value);

      if (topic === 'booking.status.updated') {
        await this.bookingStatusUpdatedHandler.handle({
          ...event,
          correlationId,
        });
      } else {
        this.logger.logKafkaEvent('warn', `Unknown topic: ${topic}`, {
          eventType: 'kafka.message.unknown_topic',
          topic,
          correlationId,
        });
      }
    } catch (error) {
      this.logger.logKafkaEvent('error', 'Failed to process message from Kafka', {
        eventType: 'kafka.message.processing_error',
        topic,
        correlationId,
        error: error.message,
      });
      throw error;
    }
  }
}

