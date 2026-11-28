import { Module } from '@nestjs/common';

import { AuthModule } from '@/features/auth/auth.module';
import { MarketModule } from '@/features/market/market.module';

import { ActivityController } from '@/features/activity/activity.controller';
import { StrategiesController } from './strategies.controller';
import { StrategiesService } from './strategies.service';
import { ResearchChatLogService } from './research-chat-log.service';
import { StrategyEngine } from './strategy-engine.service';
import { StrategyStoreController } from './strategy-store.controller';

@Module({
  imports: [AuthModule, MarketModule],
  controllers: [StrategiesController, StrategyStoreController, ActivityController],
  providers: [StrategiesService, StrategyEngine, ResearchChatLogService],
  exports: [StrategyEngine],
})
export class StrategiesModule {}
