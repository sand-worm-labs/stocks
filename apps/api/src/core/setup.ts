import compress from '@fastify/compress';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { holdsServiceKey } from '@/core/guards/service-key.guard';
import { settings } from '@/config/settings';

// A strategy with its report is sent whole, which is more than Fastify's 1 MB default. Behind the web app's proxy (or any other) every request
// comes from the proxy's address; set TRUST_PROXY there, and only there, so each person is counted by their own.
export const createAdapter = () => new FastifyAdapter({ bodyLimit: 5 * 1024 * 1024, trustProxy: settings().trustProxy });

/// What every running copy of the API has in front of its routes, the one that serves and the one a test starts alike
export async function setUp(app: NestFastifyApplication) {
  await app.register(cookie);
  await app.register(helmet);
  await app.register(compress);
  // The web app's server asks for every page it draws, from one address, so it is not counted: it is known by the key
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute', allowList: (request) => holdsServiceKey(request.headers.authorization) });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
}
