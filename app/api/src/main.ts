import compress from '@fastify/compress';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AllConfigType } from '@/core/config/config.type';

async function bootstrap() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  if (!process.env.STOCKS_API_KEY) throw new Error('STOCKS_API_KEY is not set');

  // A strategy with its report is sent whole, which is more than Fastify's 1 MB default
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ bodyLimit: 5 * 1024 * 1024 }), {
    bufferLogs: true,
  });
  const { port } = app.get(ConfigService<AllConfigType>).getOrThrow('app', { infer: true });

  app.useLogger(app.get(Logger));
  await app.register(helmet);
  await app.register(compress);
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Sandworm Stocks API').addBearerAuth().build(),
    );
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port, '0.0.0.0');
}

bootstrap();
