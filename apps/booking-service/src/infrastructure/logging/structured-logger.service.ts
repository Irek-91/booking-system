import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'pino';
import pino from 'pino';

export interface LogContext {
  service?: string;
  bookingId?: string;
  correlationId?: string;
  eventType?: string;
  status?: string;
  [key: string]: any;
}

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly logger: Logger;
  private readonly serviceName: string;

  constructor(private readonly configService: ConfigService) {
    const logLevel = this.configService.get<string>('LOG_LEVEL', 'info');
    const logFormat = this.configService.get<string>('LOG_FORMAT', 'json');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    this.serviceName = this.configService.get<string>('SERVICE_NAME', 'booking-service');

    const pinoConfig: pino.LoggerOptions = {
      level: logLevel,
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        service: this.serviceName,
      },
    };

    // В development режиме используем pretty print, в production - JSON
    if (nodeEnv === 'development' && logFormat === 'pretty') {
      this.logger = pino({
        ...pinoConfig,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      });
    } else {
      this.logger = pino(pinoConfig);
    }
  }

  log(message: string, context?: LogContext | string) {
    const logContext = this.normalizeContext(context);
    this.logger.info(logContext, message);
  }

  error(message: string, trace?: string, context?: LogContext | string) {
    const logContext = this.normalizeContext(context);
    if (trace) {
      logContext.trace = trace;
    }
    this.logger.error(logContext, message);
  }

  warn(message: string, context?: LogContext | string) {
    const logContext = this.normalizeContext(context);
    this.logger.warn(logContext, message);
  }

  debug(message: string, context?: LogContext | string) {
    const logContext = this.normalizeContext(context);
    this.logger.debug(logContext, message);
  }

  verbose(message: string, context?: LogContext | string) {
    const logContext = this.normalizeContext(context);
    this.logger.trace(logContext, message);
  }

  /**
   * Логирование с контекстом для бронирований
   */
  logBooking(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context: LogContext,
  ) {
    const logContext: LogContext = {
      service: this.serviceName,
      ...context,
    };

    switch (level) {
      case 'info':
        this.logger.info(logContext, message);
        break;
      case 'warn':
        this.logger.warn(logContext, message);
        break;
      case 'error':
        this.logger.error(logContext, message);
        break;
      case 'debug':
        this.logger.debug(logContext, message);
        break;
    }
  }

  /**
   * Логирование Kafka событий
   */
  logKafkaEvent(
    level: 'info' | 'warn' | 'error',
    message: string,
    context: LogContext,
  ) {
    const logContext: LogContext = {
      service: this.serviceName,
      eventType: context.eventType || 'kafka.event',
      ...context,
    };

    switch (level) {
      case 'info':
        this.logger.info(logContext, message);
        break;
      case 'warn':
        this.logger.warn(logContext, message);
        break;
      case 'error':
        this.logger.error(logContext, message);
        break;
    }
  }

  private normalizeContext(context?: LogContext | string): LogContext {
    if (!context) {
      return { service: this.serviceName };
    }

    if (typeof context === 'string') {
      return { service: this.serviceName, context };
    }

    return {
      service: this.serviceName,
      ...context,
    };
  }
}

