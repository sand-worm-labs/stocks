import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { ApiModule } from './api.module';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { settings } from '@/config/settings';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          level: settings().logLevel,
          transport: settings().isProduction ? undefined : { target: 'pino-pretty', options: { singleLine: true } },
          redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
        },
      }),
    }),
    DatabaseModule,
    ApiModule,
  ],
})
export class AppModule {}
