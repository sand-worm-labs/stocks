import { Body, Controller, HttpCode, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { ONBOARDING_COOKIES } from './onboarding-cookies';
import { TRADE_CHAIN } from '@/features/strategies/trading/trade.constants';
import { ForTheApp } from '@/core/decorators/for-people.decorator';
import { ZodPipe } from '@/core/pipes/zod.pipe';
import { AccountsService } from '@/features/accounts/accounts.service';
import { SANDWORM_COOKIE, SESSION_COOKIE, SESSION_TTL_SECONDS } from './auth.constants';
import { DynamicTokenError } from '@/features/auth/dynamic/dynamic-token';
import { identify, ProviderUnavailableError } from '@/features/auth/dynamic/identity';
import { isSecureRequest } from './request';
import { SandwormAccountError } from '@/features/auth/sandworm/sandworm-login';
import { sealSandwormLogin } from '@/features/auth/sandworm/sandworm-token';
import { signSession } from './token';
import { onboardedMarker } from './onboarding-marker';

import { SandwormSession } from '@/features/auth/sandworm/sandworm-session.service';

const signInSchema = z.object({ token: z.string().min(1).max(8000) });

// These say what went wrong themselves; anything else is only "we couldn't sign you in"
const isExplained = (error: unknown) =>
  error instanceof SandwormAccountError || error instanceof ProviderUnavailableError || error instanceof DynamicTokenError;

@ApiTags('Sign-in')
@ForTheApp()
@Controller('auth')
export class SessionController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly sandworm: SandwormSession,
  ) {}

  // Turns a sign-in done in the browser into a session on our side. The browser hands over the token Dynamic gave it; it is checked here
  // and never kept. The first time, the person's account is made. What is kept in the browser is our own cookie.
  @Post('session')
  @HttpCode(200)
  async signIn(
    @Body(new ZodPipe(signInSchema)) { token }: z.infer<typeof signInSchema>,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const identity = await identify(token).catch((error: unknown) => {
      if (isExplained(error)) throw error;
      throw new UnauthorizedException("We couldn't sign you in");
    });
    await this.accounts.ensure(identity.id, identity.wallets, TRADE_CHAIN.id);

    const session = await signSession(identity.id);
    void reply.header('Cache-Control', 'no-store');
    void reply.setCookie(SESSION_COOKIE, session, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isSecureRequest(request.headers),
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    // Their login on Sandworm, sealed, for research done there as them. Without it a run that needs it asks them to sign in again.
    if (identity.sandworm) {
      const sealed = await sealSandwormLogin(identity.sandworm);
      this.sandworm.keep(sealed, identity.sandworm, request, reply);
    }

    const onboarded = request.cookies[ONBOARDING_COOKIES.done] === onboardedMarker(identity.id);
    return { ok: true, onboarded };
  }

  @Post('logout')
  @HttpCode(200)
  signOut(@Res({ passthrough: true }) reply: FastifyReply) {
    void reply.clearCookie(SESSION_COOKIE, { path: '/' });
    void reply.clearCookie(SANDWORM_COOKIE, { path: '/' });
    return { ok: true };
  }
}
