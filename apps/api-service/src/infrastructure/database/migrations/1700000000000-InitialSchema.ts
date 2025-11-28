import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем расширение для UUID если его еще нет
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Создаем функцию для автоматического обновления updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Создаем таблицу bookings
    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'restaurant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'time',
            type: 'time',
            isNullable: false,
          },
          {
            name: 'guests',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'duration',
            type: 'integer',
            default: 1,
            isNullable: false,
          },
          {
            name: 'table_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['CREATED', 'CHECKING_AVAILABILITY', 'CONFIRMED', 'REJECTED'],
            default: "'CREATED'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        indices: [
          {
            name: 'IDX_bookings_restaurant_id',
            columnNames: ['restaurant_id'],
          },
          {
            name: 'IDX_bookings_date',
            columnNames: ['date'],
          },
          {
            name: 'IDX_bookings_status',
            columnNames: ['status'],
          },
          {
            name: 'IDX_bookings_table_id',
            columnNames: ['table_id'],
          },
        ],
      }),
      true,
    );

    // Создаем триггер для автоматического обновления updated_at
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
      CREATE TRIGGER update_bookings_updated_at
      BEFORE UPDATE ON bookings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Создаем таблицу outbox_events
    await queryRunner.createTable(
      new Table({
        name: 'outbox_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED'],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'retry_count',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        indices: [
          {
            name: 'IDX_outbox_events_status_created_at',
            columnNames: ['status', 'created_at'],
          },
          {
            name: 'IDX_outbox_events_event_type',
            columnNames: ['event_type'],
          },
        ],
      }),
      true,
    );

    // Создаем таблицу tables
    await queryRunner.createTable(
      new Table({
        name: 'tables',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'restaurant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'capacity',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        indices: [
          {
            name: 'IDX_tables_restaurant_id',
            columnNames: ['restaurant_id'],
          },
        ],
      }),
      true,
    );

    // Создаем внешний ключ от bookings.table_id к tables.id
    await queryRunner.createForeignKey(
      'bookings',
      new TableForeignKey({
        columnNames: ['table_id'],
        referencedTableName: 'tables',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Добавляем тестовые данные для демонстрации
    // Ресторан 1: "123e4567-e89b-12d3-a456-426614174000" (используется в примерах)
    await queryRunner.query(`
      INSERT INTO tables (restaurant_id, capacity) VALUES
        ('123e4567-e89b-12d3-a456-426614174000', 2),
        ('123e4567-e89b-12d3-a456-426614174000', 2),
        ('123e4567-e89b-12d3-a456-426614174000', 4),
        ('123e4567-e89b-12d3-a456-426614174000', 4),
        ('123e4567-e89b-12d3-a456-426614174000', 4),
        ('123e4567-e89b-12d3-a456-426614174000', 4),
        ('123e4567-e89b-12d3-a456-426614174000', 6),
        ('123e4567-e89b-12d3-a456-426614174000', 6),
        ('123e4567-e89b-12d3-a456-426614174000', 8),
        ('123e4567-e89b-12d3-a456-426614174000', 8);
    `);

    // Ресторан 2: для тестирования разных сценариев
    await queryRunner.query(`
      INSERT INTO tables (restaurant_id, capacity) VALUES
        ('223e4567-e89b-12d3-a456-426614174001', 4),
        ('223e4567-e89b-12d3-a456-426614174001', 4),
        ('223e4567-e89b-12d3-a456-426614174001', 6),
        ('223e4567-e89b-12d3-a456-426614174001', 6);
    `);

    // Ресторан 3: маленький ресторан для тестирования ограничений
    await queryRunner.query(`
      INSERT INTO tables (restaurant_id, capacity) VALUES
        ('323e4567-e89b-12d3-a456-426614174002', 2),
        ('323e4567-e89b-12d3-a456-426614174002', 2);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
    
    const bookingsTable = await queryRunner.getTable('bookings');
    if (bookingsTable) {
      const foreignKey = bookingsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('table_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('bookings', foreignKey);
      }
    }
    
    await queryRunner.dropTable('bookings');
    await queryRunner.dropTable('outbox_events');
    await queryRunner.dropTable('tables');
  }
}

