import { setDefaultResultOrder } from 'node:dns';
import { setDefaultAutoSelectFamilyAttemptTimeout } from 'node:net';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { createAdapter, setUp } from '@/core/setup';
import { checkSettings, settings } from '@/config/settings';

// The market feeds are reached over IPv4 first: a container or home network that has IPv6 addresses for a host but no route to them would
// otherwise wait for each one to time out, and the feed would look down. A connection is given ten seconds before the other family is tried,
// as these feeds are slow to answer the first time.
setDefaultResultOrder('ipv4first');
setDefaultAutoSelectFamilyAttemptTimeout(10_000);

async function bootstrap() {
  checkSettings();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, createAdapter(), { bufferLogs: true });
  const { port, isProduction } = settings();

  app.useLogger(app.get(Logger));
  await setUp(app);
  app.enableShutdownHooks();

  if (!isProduction) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Sandworm Stocks API').addBearerAuth().build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port, '0.0.0.0');
}

bootstrap();
