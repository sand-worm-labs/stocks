import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';

import { StrategiesService } from './strategies.service';
import { StrategyRecord } from '@/features/strategies/types/kept-record';

// Records as they are kept, for the web app's server, which reads them to draw its pages (with the service key)
@ApiTags('Strategy store')
@Controller('internal/strategies')
export class StrategyStoreController {
  constructor(private readonly strategies: StrategiesService) {}

  @Get()
  list(@Query('ownerId') ownerId: string) {
    if (!isUUID(ownerId)) return [];
    return this.strategies.list(ownerId);
  }

  // The tokens that strategies hold, for the relayer that keeps their pools live on the test network (with the service key)
  @Get('held-symbols')
  heldSymbols() {
    return this.strategies.heldSymbols();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const record = await this.strategies.get(id);
    // What is in the trash is gone as far as the web app's pages go, including a link someone was given to its report
    if (!record || record.deletedAt) throw new NotFoundException('That strategy was not found');
    return record;
  }

  // The body is the whole record, so it is not a class the validation pipe would strip down
  @Put(':id')
  async save(@Param('id') id: string, @Body() record: StrategyRecord) {
    if (record.id !== id) throw new BadRequestException('The strategy does not match its address');
    if (!isUUID(record.ownerId)) throw new BadRequestException('A strategy belongs to an account, which has a uuid for an id');
    return { revision: await this.strategies.save(record) };
  }
}
