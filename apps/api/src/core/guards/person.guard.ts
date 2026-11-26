import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { CallerRequest } from '@/core/decorators/asking.decorator';
import { agentOwner, hasAgentToken } from '@/features/auth/mcp-oauth/agent-token';
import { authRequired, LOCAL_USER_ID, SESSION_COOKIE } from '@/features/auth/core/auth.constants';
import { isSameOrigin } from '@/features/auth/core/request';
import { readSession } from '@/features/auth/core/token';

const READS = ['GET', 'HEAD'];

// Who is signed in. With sign-in switched off for local work, everyone is one local person.
async function signedIn(request: CallerRequest) {
  const userId = await readSession(request.cookies[SESSION_COOKIE]).catch(() => undefined);
  if (userId) return userId;
  return authRequired() ? undefined : LOCAL_USER_ID;
}

// Works out who is asking, and refuses anyone it can't tell. Nothing is answered from a cache: it is one person's.
@Injectable()
export class PersonGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<CallerRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    void reply.header('Cache-Control', 'no-store');

    const isAgent = hasAgentToken(request.headers);
    // Only a person's request that changes something has to have come from this site's pages: that check is against another site using
    // their cookie, and an agent's token is not something a browser sends on its own
    const changesSomething = !READS.includes(request.method);
    if (!isAgent && changesSomething && !isSameOrigin(request.headers)) throw new ForbiddenException("This request didn't come from the app");

    const ownerId = isAgent ? await agentOwner(request.headers) : await signedIn(request);
    if (!ownerId) throw new UnauthorizedException('Sign in first');

    request.caller = { ownerId, isAgent };
    return true;
  }
}
