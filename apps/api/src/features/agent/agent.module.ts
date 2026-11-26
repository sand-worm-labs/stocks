import { Module } from '@nestjs/common';

import { MarketModule } from '@/features/market/market.module';
import { StrategiesModule } from '@/features/strategies/strategies.module';

import { AgentController } from './agent.controller';
import { AgentThread } from './agent-thread.service';

@Module({
  imports: [StrategiesModule, MarketModule],
  controllers: [AgentController],
  providers: [AgentThread],
})
export class AgentModule {}
