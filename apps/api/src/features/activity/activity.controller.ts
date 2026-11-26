import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Asking, Caller } from '@/core/decorators/asking.decorator';
import { ForPeople } from '@/core/decorators/for-people.decorator';
import { activityOf } from './strategy-activity';

import { StrategyEngine } from '@/features/strategies/strategy-engine.service';

@ApiTags('Activity')
@ForPeople()
@Controller('activity')
export class ActivityController {
  constructor(private readonly engine: StrategyEngine) {}

  // What has happened to all of this person's strategies, newest first
  @Get()
  async list(@Asking() { ownerId }: Caller) {
    const strategies = await this.engine.steps.list(ownerId);
    return strategies.flatMap(activityOf).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }
}
