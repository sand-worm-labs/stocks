import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { DynamicTokenError } from '@/features/auth/dynamic/dynamic-token';
import { ProviderUnavailableError } from '@/features/auth/dynamic/identity';
import { SandwormAccountError } from '@/features/auth/sandworm/sandworm-login';
import { StrategyError } from '@/features/strategies/lifecycle/strategy-lifecycle';

const UNEXPECTED = { status: 500, message: 'Something went wrong on our side. Try again in a moment' };

// What went wrong, as a status and a sentence that is safe to show the person
function describe(error: unknown) {
  if (error instanceof StrategyError || error instanceof SandwormAccountError) return { status: error.status, message: error.message };
  if (error instanceof ProviderUnavailableError) return { status: 503, message: error.message };
  if (error instanceof DynamicTokenError) return { status: 401, message: error.message };
  if (error instanceof HttpException) return { status: error.getStatus(), message: error.message };
  return undefined;
}

// How every route the app and agents call says no: `{ error }`
@Catch()
export class AppErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppErrorFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const known = describe(error);
    if (!known) this.logger.error(error);

    const { status, message } = known ?? UNEXPECTED;
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    void reply.header('Cache-Control', 'no-store').status(status).send({ error: message });
  }
}
