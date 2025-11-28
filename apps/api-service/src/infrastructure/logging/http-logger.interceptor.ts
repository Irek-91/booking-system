import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { StructuredLoggerService } from './structured-logger.service';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const correlationId = (request as any).correlationId || 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.logHttpRequest(
            request.method,
            request.path,
            response.statusCode,
            duration,
            {
              correlationId,
              httpMethod: request.method,
              httpPath: request.path,
              httpStatus: response.statusCode,
              httpDuration: duration,
            },
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.logHttpRequest(
            request.method,
            request.path,
            error.status || 500,
            duration,
            {
              correlationId,
              error: error.message,
              httpMethod: request.method,
              httpPath: request.path,
              httpStatus: error.status || 500,
              httpDuration: duration,
            },
          );
        },
      }),
    );
  }
}

