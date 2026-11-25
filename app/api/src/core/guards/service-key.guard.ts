import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';

export const Public = () => SetMetadata('isPublic', true);

// Only the Next app calls this API, with a key they share; it has already checked who the person is. Without the key nothing is read or
// kept. The key is compared in constant time.
@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>('isPublic', [context.getHandler(), context.getClass()])) return true;

    const expected = Buffer.from(process.env.STOCKS_API_KEY ?? '');
    const sent = Buffer.from((context.switchToHttp().getRequest().headers.authorization ?? '').replace(/^Bearer /, ''));
    const matches = expected.length > 0 && sent.length === expected.length && timingSafeEqual(sent, expected);
    if (!matches) throw new UnauthorizedException();
    return true;
  }
}
