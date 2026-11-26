import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

import { Public } from '@/core/guards/service-key.guard';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  // The API only starts once its migrations have run, so a database that answers is a database that is up to date
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.database.pingCheck('database')]);
  }
}
