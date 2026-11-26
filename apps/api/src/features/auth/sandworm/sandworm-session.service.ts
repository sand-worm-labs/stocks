import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { SANDWORM_COOKIE } from '@/features/auth/core/auth.constants';
import { isSecureRequest } from '@/features/auth/core/request';
import type { SandwormLogin } from './sandworm-login';
import { sandwormCookieOptions, sandwormTokenFrom } from './sandworm-token';

// The person's login on Sandworm, sealed in a cookie of theirs so research can be done there as them
@Injectable()
export class SandwormSession {
  keep(sealed: string, login: SandwormLogin, request: FastifyRequest, reply: FastifyReply) {
    const options = sandwormCookieOptions(login, isSecureRequest(request.headers));
    void reply.setCookie(SANDWORM_COOKIE, sealed, options);
  }

  /// Their access token, renewed if it has run out, or nothing when they have to sign in again
  tokenOf(request: FastifyRequest, reply: FastifyReply) {
    return sandwormTokenFrom({
      read: () => request.cookies[SANDWORM_COOKIE],
      write: (sealed, login) => this.keep(sealed, login, request, reply),
    });
  }
}
