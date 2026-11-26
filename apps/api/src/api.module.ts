import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ServiceKeyGuard } from '@/core/guards/service-key.guard';
import { AccountsModule } from '@/features/accounts/accounts.module';
import { AuthModule } from '@/features/auth/auth.module';
import { HealthModule } from '@/features/health/health.module';
import { MarketModule } from '@/features/market/market.module';
import { StrategiesModule } from '@/features/strategies/strategies.module';

// Every feature of the API. A feature has its own folder under features/ (module, controller, service, entities, tests).
@Module({
  imports: [HealthModule, AccountsModule, AuthModule, StrategiesModule, MarketModule],
  providers: [{ provide: APP_GUARD, useClass: ServiceKeyGuard }],
})
export class ApiModule {}
