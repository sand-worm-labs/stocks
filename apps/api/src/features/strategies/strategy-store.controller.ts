import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';

import { StrategiesService } from './strategies.service';
import { StrategyRecord } from './strategy-record';

@ApiTags('Strategies')
@Controller('strategies')
export class StrategiesController {
  constructor(private readonly strategies: StrategiesService) {}

  @Get()
  list(@Query('ownerId') ownerId: string) {
    if (!isUUID(ownerId)) return [];
    return this.strategies.list(ownerId);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const record = await this.strategies.get(id);
    if (!record) throw new NotFoundException('That strategy was not found');
    return record;
  }

  // The body is the whole record, so it is not a class the validation pipe would strip down
  @Put(':id')
  async save(@Param('id') id: string, @Body() record: StrategyRecord) {
    if (record.id !== id) throw new BadRequestException('The strategy does not match its address');
    if (!isUUID(record.ownerId)) throw new BadRequestException('A strategy belongs to an account, which has a uuid for an id');
    await this.strategies.save(record);
  }
}
