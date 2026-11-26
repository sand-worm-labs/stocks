import { Body, Controller, ForbiddenException, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { Asking, Caller } from '@/core/decorators/asking.decorator';
import { ForPeople } from '@/core/decorators/for-people.decorator';
import { ZodPipe } from '@/core/pipes/zod.pipe';
import { checkAuthorizeRequest, issueCode, redirectWith } from './oauth';
import { StrategyError } from '@/features/strategies/lifecycle/strategy-lifecycle';

const approveSchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string(),
  state: z.string().optional(),
  code_challenge: z.string(),
  allow: z.boolean(),
});

// The part of an agent's sign-in that is about the person
@ApiTags('Agent sign-in')
@ForPeople()
@Controller('oauth')
export class AgentApprovalController {
  // The person has answered the agent's request in the app: where to send the browser back to, with the code if they allowed it. The
  // request is checked again here in full, since what the page held is not to be trusted.
  @Post('approve')
  @HttpCode(200)
  async approve(@Asking() { ownerId, isAgent }: Caller, @Body(new ZodPipe(approveSchema)) body: z.infer<typeof approveSchema>) {
    // An agent can't let another agent in, or give itself longer
    if (isAgent) throw new ForbiddenException('Only you can allow an agent, signed in on the app');

    const checked = await checkAuthorizeRequest({
      response_type: 'code',
      client_id: body.client_id,
      redirect_uri: body.redirect_uri,
      state: body.state,
      code_challenge: body.code_challenge,
      code_challenge_method: 'S256',
    });
    if (!checked.ok) throw new StrategyError(checked.error, 400);

    const { redirectUri, state } = checked.request;
    if (!body.allow) return { redirect: redirectWith(redirectUri, { error: 'access_denied', state }) };
    const code = await issueCode(ownerId, checked.request);
    return { redirect: redirectWith(redirectUri, { code, state }) };
  }

  // Whether the token (or session) the request brings is good. The Stocks MCP asks this before it answers an agent, so a token that has run
  // out is answered with the standard "sign in again" and the agent refreshes it, instead of failing in the middle of a tool.
  @Get('whoami')
  whoami() {
    return { ok: true };
  }
}
