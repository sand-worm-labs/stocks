import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { OAuthError } from '@/features/auth/mcp-oauth/oauth';

// Says what went wrong the way the OAuth standard has it: a code and a sentence
@Catch()
export class OAuthErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthErrorFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    if (error instanceof OAuthError) {
      void reply.status(400).send({ error: error.code, error_description: error.message });
      return;
    }
    this.logger.error(error);
    void reply.status(500).send({ error: 'server_error', error_description: 'Something went wrong on our side' });
  }
}
