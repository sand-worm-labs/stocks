import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { isSameOrigin } from '@/features/auth/core/request';

// For what is asked before there is anyone to check, such as signing in: only the app's own pages may ask it
@Injectable()
export class SameOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { headers } = context.switchToHttp().getRequest<FastifyRequest>();
    if (!isSameOrigin(headers)) throw new ForbiddenException("This request didn't come from the app");
    return true;
  }
}
