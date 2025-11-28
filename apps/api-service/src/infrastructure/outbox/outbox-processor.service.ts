import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxService } from './outbox.service';
import { KafkaProducerService } from '../kafka/kafka-producer.service';
import { OutboxEventStatus } from '../database/entities/outbox-event.entity';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { BookingCreatedEvent } from '@booking-system/shared';

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly maxRetries: number;
  private readonly processingIntervalMs: number;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly kafkaProducer: KafkaProducerService,
    private readonly configService: ConfigService,
    private readonly logger: StructuredLoggerService,
  ) {
    // Интервал обработки событий в миллисекундах (по умолчанию 5 секунд)
    this.processingIntervalMs = this.configService.get<number>(
      'OUTBOX_PROCESSING_INTERVAL_MS',
      5000,
    );
    // Максимальное количество попыток повтора (по умолчанию 3)
    this.maxRetries = this.configService.get<number>(
      'OUTBOX_MAX_RETRIES',
      3,
    );
  }

  async onModuleInit() {
    this.logger.log('Starting outbox event processor', {
      eventType: 'outbox.processor.started',
      interval: this.processingIntervalMs,
      maxRetries: this.maxRetries,
    });
    this.startProcessing();
  }

  async onModuleDestroy() {
    this.stopProcessing();
    this.logger.log('Outbox event processor stopped', {
      eventType: 'outbox.processor.stopped',
    });
  }

  private startProcessing() {
    this.processingInterval = setInterval(() => {
      this.processOutboxEvents().catch((error) => {
        this.logger.error(
          'Error processing outbox events',
          error.stack,
          {
            eventType: 'outbox.processor.error',
            error: error.message,
          },
        );
      });
    }, this.processingIntervalMs);
  }

  private stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processOutboxEvents(): Promise<void> {
    const pendingEvents = await this.outboxService.getPendingEvents(10);

    if (pendingEvents.length === 0) {
      return;
    }

    this.logger.debug('Processing outbox events', {
      eventType: 'outbox.processor.processing',
      count: pendingEvents.length,
    });

    for (const event of pendingEvents) {
      try {
        await this.outboxService.markAsProcessing(event.id);

        // Отправляем событие в Kafka
        if (event.eventType === 'booking.created') {
          const payload = event.payload as BookingCreatedEvent;
          await this.kafkaProducer.publishBookingCreated(payload);
        }

        await this.outboxService.markAsSent(event.id);
        this.logger.logKafkaEvent('info', 'Outbox event sent successfully', {
          eventType: 'outbox.event.sent',
          outboxEventId: event.id,
          kafkaEventType: event.eventType,
          bookingId: (event.payload as any)?.bookingId,
          correlationId: (event.payload as any)?.correlationId,
        });
      } catch (error) {
        const retryCount = event.retryCount + 1;
        await this.outboxService.incrementRetryCount(event.id);

        if (retryCount >= this.maxRetries) {
          await this.outboxService.markAsFailed(
            event.id,
            error.message,
            retryCount,
          );
          this.logger.logKafkaEvent('error', 'Outbox event failed after max retries', {
            eventType: 'outbox.event.failed',
            outboxEventId: event.id,
            kafkaEventType: event.eventType,
            retryCount,
            error: error.message,
            bookingId: (event.payload as any)?.bookingId,
            correlationId: (event.payload as any)?.correlationId,
          });
        } else {
          // Возвращаем статус в PENDING для повторной попытки
          await this.outboxService.markAsPending(event.id);
          this.logger.logKafkaEvent('warn', 'Outbox event will be retried', {
            eventType: 'outbox.event.retry',
            outboxEventId: event.id,
            kafkaEventType: event.eventType,
            retryCount,
            error: error.message,
            bookingId: (event.payload as any)?.bookingId,
            correlationId: (event.payload as any)?.correlationId,
          });
        }
      }
    }
  }
}

