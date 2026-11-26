import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { settings } from '@/config/settings';

export const Public = () => SetMetadata('isPublic', true);

/// Whether an `Authorization` header carries the key the web app's server and this API share. Compared in constant time.
export function holdsServiceKey(authorization = '') {
  const expected = Buffer.from(settings().serviceKey ?? '');
  const sent = Buffer.from(authorization.replace(/^Bearer /, ''));
  return expected.length > 0 && sent.length === expected.length && timingSafeEqual(sent, expected);
}

// A route that isn't marked public is for the web app's server, which sends a key they share and has already checked who the person is. The
// routes people and agents call are public to this guard and check the person themselves (see `ForPeople`).
@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>('isPublic', [context.getHandler(), context.getClass()])) return true;

    const { headers } = context.switchToHttp().getRequest<FastifyRequest>();
    if (!holdsServiceKey(headers.authorization)) throw new UnauthorizedException();
    return true;
  }
}
