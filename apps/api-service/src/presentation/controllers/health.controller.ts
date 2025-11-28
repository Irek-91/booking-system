import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({
    summary: 'Проверка здоровья сервиса',
    description: 'Возвращает статус работы API Service',
  })
  @ApiResponse({
    status: 200,
    description: 'Сервис работает нормально',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'api-service' },
        timestamp: { type: 'string', example: '2025-11-27T17:30:00.000Z' },
      },
    },
  })
  health() {
    return {
      status: 'ok',
      service: 'api-service',
      timestamp: new Date().toISOString(),
    };
  }
}

