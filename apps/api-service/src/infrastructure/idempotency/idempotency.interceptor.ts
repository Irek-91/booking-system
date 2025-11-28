import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { IdempotencyService } from './idempotency.service';

const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Проверяем наличие заголовка Idempotency-Key
    const idempotencyKey = request.headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()] as string;

    if (!idempotencyKey) {
      // Если заголовка нет, просто пропускаем запрос дальше
      return next.handle();
    }

    // Валидация ключа идемпотентности (должен быть непустым)
    if (!idempotencyKey.trim()) {
      this.logger.warn('Empty idempotency key provided');
      return next.handle();
    }

    const method = request.method;
    const path = request.path;
    const requestBody = request.body || {};

    // Проверяем наличие сохраненного ответа
    const cachedResponse = await this.idempotencyService.getCachedResponse(
      idempotencyKey,
      method,
      path,
      requestBody,
    );

    if (cachedResponse) {
      this.logger.log(
        `Returning cached response for idempotency key ${idempotencyKey}`,
      );
      response.status(cachedResponse.statusCode);
      return of(cachedResponse.response);
    }

    // Если ответа нет, выполняем запрос и сохраняем результат
    let responseBody: any;
    let statusCode: number = HttpStatus.OK;

    return next.handle().pipe(
      tap({
        next: (data) => {
          responseBody = data;
          statusCode = response.statusCode || HttpStatus.OK;
        },
        complete: async () => {
          // Сохраняем ответ только для успешных запросов (2xx, 3xx)
          if (statusCode >= 200 && statusCode < 400) {
            await this.idempotencyService.saveResponse(
              idempotencyKey,
              method,
              path,
              requestBody,
              responseBody,
              statusCode,
            );
          }
        },
      }),
    );
  }
}

