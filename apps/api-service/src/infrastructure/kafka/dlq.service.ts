import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { StructuredLoggerService } from '../logging/structured-logger.service';

export interface DLQMessage {
  originalTopic: string;
  originalPartition: number;
  originalOffset: string;
  originalMessage: any;
  error: string;
  correlationId?: string;
  retryCount: number;
  timestamp: Date;
}

@Injectable()
export class DLQService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private readonly dlqTopic: string;

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
        'api-service',
      ),
      brokers,
    });

    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.LegacyPartitioner,
    });

    this.dlqTopic = this.configService.get<string>(
      'KAFKA_TOPIC_BOOKING_STATUS_UPDATED_FAILED',
      'booking.status.updated.failed',
    );
  }

  async onModuleInit() {
    await this.producer.connect();
    this.logger.logKafkaEvent('info', 'DLQ producer connected', {
      eventType: 'kafka.dlq.producer.connected',
      topic: this.dlqTopic,
    });
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.logKafkaEvent('info', 'DLQ producer disconnected', {
      eventType: 'kafka.dlq.producer.disconnected',
    });
  }

  async sendToDLQ(dlqMessage: DLQMessage): Promise<void> {
    try {
      await this.producer.send({
        topic: this.dlqTopic,
        messages: [
          {
            key: dlqMessage.originalMessage.bookingId || 'unknown',
            value: JSON.stringify(dlqMessage),
            headers: {
              'correlation-id': dlqMessage.correlationId || '',
              'original-topic': dlqMessage.originalTopic,
              'original-partition': dlqMessage.originalPartition.toString(),
              'original-offset': dlqMessage.originalOffset,
            },
          },
        ],
      });

      this.logger.logKafkaEvent('error', 'Message sent to DLQ', {
        eventType: 'kafka.dlq.message.sent',
        topic: this.dlqTopic,
        correlationId: dlqMessage.correlationId,
        originalTopic: dlqMessage.originalTopic,
        bookingId: dlqMessage.originalMessage?.bookingId,
        error: dlqMessage.error,
        retryCount: dlqMessage.retryCount,
      });
    } catch (error) {
      this.logger.logKafkaEvent('error', 'Failed to send message to DLQ', {
        eventType: 'kafka.dlq.send_error',
        topic: this.dlqTopic,
        correlationId: dlqMessage.correlationId,
        error: error.message,
      });
      // Не бросаем ошибку, чтобы не ломать основной поток
    }
  }
}

