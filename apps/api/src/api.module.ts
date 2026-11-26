import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ServiceKeyGuard } from '@/core/guards/service-key.guard';
import { AccountsModule } from '@/features/accounts/accounts.module';
import { HealthModule } from '@/features/health/health.module';
import { StrategiesModule } from '@/features/strategies/strategies.module';

// Every feature of the API. A feature has its own folder under features/ (module, controller, service, entities, tests).
@Module({
  imports: [HealthModule, AccountsModule, StrategiesModule],
  providers: [{ provide: APP_GUARD, useClass: ServiceKeyGuard }],
})
export class ApiModule {}
