import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { BookingStatusUpdatedHandler } from '../../application/handlers/booking-status-updated.handler';
import { DLQService } from './dlq.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;

  private readonly maxRetries: number;
  private readonly retryDelays: number[]; // Exponential backoff delays in ms
  private isShuttingDown = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly bookingStatusUpdatedHandler: BookingStatusUpdatedHandler,
    private readonly dlqService: DLQService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.maxRetries = this.configService.get<number>(
      'KAFKA_CONSUMER_MAX_RETRIES',
      3,
    );
    // Exponential backoff: 1s, 2s, 4s
    this.retryDelays = [1000, 2000, 4000];
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
      sessionTimeout: this.configService.get<number>(
        'KAFKA_CONSUMER_SESSION_TIMEOUT',
        30000,
      ),
      heartbeatInterval: this.configService.get<number>(
        'KAFKA_CONSUMER_HEARTBEAT_INTERVAL',
        3000,
      ),
      maxInFlightRequests: 1,
      retry: {
        retries: 0, // Отключаем автоматический retry на уровне KafkaJS, делаем свой
        initialRetryTime: 1000,
      },
      allowAutoTopicCreation: true,
    });
  }

  async onModuleInit() {
    try {
      await this.consumer.connect();
      this.logger.logKafkaEvent('info', 'Kafka consumer connected', {
        eventType: 'kafka.consumer.connected',
      });

      const topic = this.configService.get<string>(
        'KAFKA_TOPIC_BOOKING_STATUS_UPDATED',
        'booking.status.updated',
      );

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
    } catch (error) {
      this.logger.error(`Failed to initialize Kafka consumer: ${error.message}`, error.stack);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.logKafkaEvent('info', 'Gracefully shutting down Kafka consumer', {
      eventType: 'kafka.consumer.shutting_down',
    });
    this.isShuttingDown = true;

    try {
      await this.consumer.stop();
      this.logger.logKafkaEvent('info', 'Kafka consumer stopped', {
        eventType: 'kafka.consumer.stopped',
      });

      await this.consumer.disconnect();
      this.logger.logKafkaEvent('info', 'Kafka consumer disconnected', {
        eventType: 'kafka.consumer.disconnected',
      });
    } catch (error) {
      this.logger.logKafkaEvent('error', 'Error during graceful shutdown', {
        eventType: 'kafka.consumer.shutdown_error',
        error: error.message,
      });
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.logKafkaEvent('warn', 'Consumer is shutting down, skipping message', {
        eventType: 'kafka.consumer.shutting_down',
      });
      return;
    }

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

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= this.maxRetries) {
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
          return;
        } else {
          this.logger.logKafkaEvent('warn', `Unknown topic: ${topic}`, {
            eventType: 'kafka.message.unknown_topic',
            topic,
            correlationId,
          });
          return;
        }
      } catch (error) {
        lastError = error as Error;
        retryCount++;

        if (retryCount <= this.maxRetries) {
          const delay = this.retryDelays[retryCount - 1] || 4000;
          this.logger.logKafkaEvent('warn', 'Failed to process message, retrying', {
            eventType: 'kafka.message.retry',
            topic,
            correlationId,
            attempt: retryCount,
            maxRetries: this.maxRetries,
            delay,
            error: error.message,
          });
          await this.sleep(delay);
        } else {
          this.logger.logKafkaEvent('error', 'Failed to process message after max retries, sending to DLQ', {
            eventType: 'kafka.message.dlq',
            topic,
            correlationId,
            retryCount,
            error: error.message,
          });

          try {
            const value = message.value?.toString();
            const originalMessage = value ? JSON.parse(value) : null;

            await this.dlqService.sendToDLQ({
              originalTopic: topic,
              originalPartition: partition,
              originalOffset: message.offset,
              originalMessage,
              error: error.message,
              correlationId,
              retryCount,
              timestamp: new Date(),
            });
          } catch (dlqError) {
            this.logger.logKafkaEvent('error', 'Failed to send message to DLQ', {
              eventType: 'kafka.dlq.send_error',
              topic,
              correlationId,
              error: dlqError.message,
            });
          }

          // Не бросаем ошибку дальше, чтобы не блокировать обработку других сообщений
          return;
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

