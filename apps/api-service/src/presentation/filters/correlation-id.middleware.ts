import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const correlationId =
      req.headers['x-correlation-id'] || req.headers['correlation-id'] || uuidv4();

    req.headers['x-correlation-id'] = correlationId as string;
    res.setHeader('X-Correlation-Id', correlationId as string);

    // Добавляем correlationId в объект запроса для использования в сервисах
    (req as any).correlationId = correlationId;

    this.logger.debug(`Request ${req.method} ${req.path} - Correlation ID: ${correlationId}`);

    next();
  }
}

