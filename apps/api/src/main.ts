import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { createAdapter, setUp } from '@/core/setup';
import { checkSettings, settings } from '@/config/settings';

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
