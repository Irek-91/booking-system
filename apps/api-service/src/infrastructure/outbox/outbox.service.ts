import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OutboxEventEntity, OutboxEventStatus } from '../database/entities/outbox-event.entity';

@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepository: Repository<OutboxEventEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async saveEventInTransaction(
    eventType: string,
    payload: Record<string, any>,
    transactionCallback: () => Promise<void>,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await transactionCallback();

      // Сохраняем событие в outbox в той же транзакции
      const outboxEvent = this.outboxRepository.create({
        eventType,
        payload,
        status: OutboxEventStatus.PENDING,
      });
      await queryRunner.manager.save(OutboxEventEntity, outboxEvent);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPendingEvents(limit: number = 10): Promise<OutboxEventEntity[]> {
    return this.outboxRepository.find({
      where: { status: OutboxEventStatus.PENDING },
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  async markAsProcessing(id: string): Promise<void> {
    await this.outboxRepository.update(id, {
      status: OutboxEventStatus.PROCESSING,
    });
  }

  async markAsPending(id: string): Promise<void> {
    await this.outboxRepository.update(id, {
      status: OutboxEventStatus.PENDING,
    });
  }

  async markAsSent(id: string): Promise<void> {
    await this.outboxRepository.update(id, {
      status: OutboxEventStatus.SENT,
    });
  }

  async markAsFailed(id: string, errorMessage: string, retryCount: number): Promise<void> {
    await this.outboxRepository.update(id, {
      status: OutboxEventStatus.FAILED,
      errorMessage,
      retryCount,
    });
  }

  async incrementRetryCount(id: string): Promise<void> {
    const event = await this.outboxRepository.findOne({ where: { id } });
    if (event) {
      await this.outboxRepository.update(id, {
        retryCount: event.retryCount + 1,
      });
    }
  }
}

