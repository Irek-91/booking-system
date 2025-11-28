import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TableEntity } from './entities/table.entity';
import { TableRepository } from './repositories/table.repository';
import {
  TABLE_REPOSITORY,
} from '../../application/interfaces/table.repository.interface';

@Module({
  imports: [TypeOrmModule.forFeature([TableEntity])],
  providers: [
    {
      provide: TABLE_REPOSITORY,
      useClass: TableRepository,
    },
  ],
  exports: [TABLE_REPOSITORY],
})
export class TablesModule {}

