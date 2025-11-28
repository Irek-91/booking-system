import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseFilters,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiBody,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { BookingResponseDto } from '../dto/booking-response.dto';
import { CreateBookingCommand } from '../../application/commands/create-booking.command';
import { GetBookingQuery } from '../../application/queries/get-booking.query';
import { Booking } from '../../domain/entities/booking.entity';
import { HttpExceptionFilter } from '../filters/exception-filters/http-exception-filter';

@ApiTags('bookings')
@Controller('bookings')
@UseFilters(HttpExceptionFilter)
export class BookingsController {
  private readonly logger = new Logger(BookingsController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Создать новую бронь',
    description:
      'Создает новую бронь столика в ресторане. Система автоматически выберет свободный стол с достаточной вместимостью.',
  })
  @ApiHeader({
    name: 'X-Correlation-Id',
    description: 'Correlation ID для отслеживания запроса',
    required: false,
    example: 'test-123',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description: 'Ключ идемпотентности для предотвращения дублирования',
    required: false,
    example: 'unique-request-id-12345',
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    description: 'Бронь успешно создана',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка валидации данных',
    schema: {
      type: 'object',
      properties: {
        errorsMessages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              field: { type: 'string' },
            },
          },
        },
        correlationId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Нет доступных столов на указанное время',
  })
  async create(
    @Body() createBookingDto: CreateBookingDto,
    @Req() request: any,
  ): Promise<BookingResponseDto> {
    this.logger.log(`Creating booking for restaurant ${createBookingDto.restaurantId}`);

    const command = new CreateBookingCommand();
    command.restaurantId = createBookingDto.restaurantId;
    command.date = createBookingDto.date;
    command.time = createBookingDto.time;
    command.guests = createBookingDto.guests;
    command.duration = createBookingDto.duration;
    command.correlationId = request.correlationId || request.headers['x-correlation-id'];

    const booking = await this.commandBus.execute<CreateBookingCommand, Booking>(
      command,
    );

    return this.toDto(booking);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить информацию о брони',
    description: 'Возвращает информацию о брони по её UUID',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID бронирования',
    type: String,
    format: 'uuid',
    example: '91e939e9-0ab6-4bfa-a22e-768d1e49c436',
  })
  @ApiResponse({
    status: 200,
    description: 'Информация о брони',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Неверный формат UUID',
  })
  @ApiResponse({
    status: 404,
    description: 'Бронь не найдена',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }))
    id: string,
  ): Promise<BookingResponseDto> {
    this.logger.log(`Getting booking with ID: ${id}`);

    const query = new GetBookingQuery();
    query.id = id;

    const booking = await this.queryBus.execute<GetBookingQuery, Booking>(query);

    return this.toDto(booking);
  }

  private toDto(booking: Booking): BookingResponseDto {
    return {
      id: booking.getId(),
      restaurantId: booking.getRestaurantId().toString(),
      date: booking.getDate().toISOString(),
      time: booking.getTime().toString(),
      guests: booking.getGuests().toNumber(),
      duration: booking.getDuration(),
      tableId: booking.getTableId(),
      status: booking.getStatus(),
      createdAt: booking.getCreatedAt(),
      updatedAt: booking.getUpdatedAt(),
    };
  }
}

