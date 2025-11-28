import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { createHash } from 'crypto';

export interface IdempotencyRecord {
  requestHash: string;
  response: any;
  statusCode: number;
  createdAt: number;
}

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly ttl: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.ttl = this.configService.get<number>('IDEMPOTENCY_TTL', 86400);
  }

  /**
   * Вычисляет хеш тела запроса для дополнительной проверки
   */
  private hashRequest(body: any): string {
    const normalizedBody = JSON.stringify(body, Object.keys(body).sort());
    return createHash('sha256').update(normalizedBody).digest('hex');
  }

  /**
   * Формирует ключ Redis для идемпотентности
   */
  private getKey(idempotencyKey: string, method: string, path: string): string {
    return `idempotency:${method}:${path}:${idempotencyKey}`;
  }

  /**
   * Проверяет наличие ключа идемпотентности и возвращает сохраненный ответ
   */
  async getCachedResponse(
    idempotencyKey: string,
    method: string,
    path: string,
    requestBody: any,
  ): Promise<IdempotencyRecord | null> {
    try {
      const key = this.getKey(idempotencyKey, method, path);
      const cached = await this.redisService.get(key);

      if (!cached) {
        return null;
      }

      const record: IdempotencyRecord = JSON.parse(cached);
      const requestHash = this.hashRequest(requestBody);

      // Проверяем, что хеш запроса совпадает
      if (record.requestHash !== requestHash) {
        this.logger.warn(
          `Idempotency key ${idempotencyKey} exists but request hash mismatch`,
        );
        return null;
      }

      return record;
    } catch (error) {
      this.logger.error(
        `Error getting cached response for idempotency key ${idempotencyKey}: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Сохраняет ключ идемпотентности с ответом
   */
  async saveResponse(
    idempotencyKey: string,
    method: string,
    path: string,
    requestBody: any,
    response: any,
    statusCode: number,
  ): Promise<void> {
    try {
      const key = this.getKey(idempotencyKey, method, path);
      const requestHash = this.hashRequest(requestBody);

      const record: IdempotencyRecord = {
        requestHash,
        response,
        statusCode,
        createdAt: Date.now(),
      };

      await this.redisService.set(key, JSON.stringify(record), this.ttl);
      this.logger.debug(`Saved idempotency key ${idempotencyKey} with TTL ${this.ttl}s`);
    } catch (error) {
      this.logger.error(
        `Error saving idempotency key ${idempotencyKey}: ${error.message}`,
        error.stack,
      );
      // Не бросаем ошибку, чтобы не ломать основной поток
    }
  }
}

