import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { exceptionResponseType } from '../../base/types/exception.type';
import { StructuredLoggerService } from '../../../infrastructure/logging/structured-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // Пропускаем Swagger маршруты без обработки
    if (request.path.startsWith('/api') || request.path.startsWith('/api-json')) {
      return;
    }
    
    const correlationId = (request.headers['x-correlation-id'] as string) || 'unknown';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody: any = exception.getResponse();

      // Для всех ошибок 400 (Bad Request) возвращаем единый формат с массивом errorsMessages
      if (status === HttpStatus.BAD_REQUEST) {
        const errorsResponse: exceptionResponseType = {
          errorsMessages: [],
        };

        // Обрабатываем разные форматы ошибок валидации
        if (Array.isArray(responseBody.message)) {
          // Если message - массив объектов с полями message и field
          responseBody.message.forEach((m: any) => {
            if (typeof m === 'object' && m.message !== undefined) {
              errorsResponse.errorsMessages.push({
                message: m.message || 'Validation failed',
                field: m.field || '',
              });
            } else if (typeof m === 'string') {
              errorsResponse.errorsMessages.push({
                message: m,
                field: '',
              });
            }
          });
        } else if (typeof responseBody.message === 'string') {
          // Если message - строка, создаем один объект ошибки
          errorsResponse.errorsMessages.push({
            message: responseBody.message,
            field: '',
          });
        } else if (Array.isArray(responseBody.errors)) {
          // Если errors - массив строк
          responseBody.errors.forEach((error: string) => {
            errorsResponse.errorsMessages.push({
              message: error,
              field: '',
            });
          });
        } else {
          // Fallback: если формат неизвестен
          errorsResponse.errorsMessages.push({
            message: 'Validation failed',
            field: '',
          });
        }

        // Добавляем correlationId в ответ
        const finalResponse = {
          ...errorsResponse,
          correlationId,
        };

        this.logger.warn(`Error ${status} on ${request.method} ${request.url}`, {
          correlationId,
          httpMethod: request.method,
          httpPath: request.url,
          httpStatus: status,
          errors: errorsResponse.errorsMessages,
        });

        response.status(status).json(finalResponse);
      } else if (
        status === HttpStatus.NOT_FOUND ||
        status === HttpStatus.UNAUTHORIZED ||
        status === HttpStatus.INTERNAL_SERVER_ERROR
      ) {
        // Для других статусов используем стандартный формат
        const errorsResponse: exceptionResponseType = {
          errorsMessages: [],
        };

        if (Array.isArray(responseBody.message)) {
          responseBody.message.forEach((m: any) => {
            if (typeof m === 'object' && m.message !== undefined) {
              errorsResponse.errorsMessages.push({
                message: m.message || 'Error occurred',
                field: m.field || '',
              });
            } else if (typeof m === 'string') {
              errorsResponse.errorsMessages.push({
                message: m,
                field: '',
              });
            }
          });
        } else if (typeof responseBody.message === 'string') {
          errorsResponse.errorsMessages.push({
            message: responseBody.message,
            field: '',
          });
        } else {
          errorsResponse.errorsMessages.push({
            message: 'An error occurred',
            field: '',
          });
        }

        const finalResponse = {
          ...errorsResponse,
          correlationId,
        };

        if (status >= 500) {
          this.logger.error(
            `Error ${status} on ${request.method} ${request.url}`,
            exception instanceof Error ? exception.stack : String(exception),
            {
              correlationId,
              httpMethod: request.method,
              httpPath: request.url,
              httpStatus: status,
            },
          );
        } else {
          this.logger.warn(`Error ${status} on ${request.method} ${request.url}`, {
            correlationId,
            httpMethod: request.method,
            httpPath: request.url,
            httpStatus: status,
            errors: errorsResponse.errorsMessages,
          });
        }

        response.status(status).json(finalResponse);
      } else {
        // Для остальных статусов используем простой формат
        const errorResponse = {
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: request.url,
          correlationId,
        };

        this.logger.warn(`Error ${status} on ${request.method} ${request.url}`, {
          correlationId,
          httpMethod: request.method,
          httpPath: request.url,
          httpStatus: status,
        });

        response.status(status).json(errorResponse);
      }
    } else {
      const errorResponse = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: new Date().toISOString(),
        path: request.url,
        correlationId,
        message: 'Internal server error',
      };

      this.logger.error(
        `Internal server error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
        {
          correlationId,
          httpMethod: request.method,
          httpPath: request.url,
          httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        },
      );

      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse);
    }
  }
}
