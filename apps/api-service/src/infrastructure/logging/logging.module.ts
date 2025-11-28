import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { StructuredLoggerService } from './structured-logger.service';
import { HttpLoggerInterceptor } from './http-logger.interceptor';
import { HttpExceptionFilter } from '../../presentation/filters/exception-filters/http-exception-filter';

@Global()
@Module({
  providers: [
    StructuredLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
  exports: [StructuredLoggerService],
})
export class LoggingModule {}

