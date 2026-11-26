import { Body, Controller, HttpCode, Options, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { OAuthErrorFilter } from '@/core/filters/oauth-error.filter';
import { OpenToAnySiteGuard } from '@/core/guards/open-to-any-site.guard';
import { Public } from '@/core/guards/service-key.guard';
import { registerClient } from './oauth';
import { tokenFor } from './oauth-token';

// The part of an agent's sign-in that the agent itself calls
@ApiTags('Agent sign-in')
@Public()
@UseGuards(OpenToAnySiteGuard)
@UseFilters(OAuthErrorFilter)
@Controller('oauth')
export class AgentSignInController {
  // An agent says what it is and where to send the person back to, and is given an id for itself
  @Post('register')
  register(@Body() sent: unknown) {
    return registerClient(sent ?? {});
  }

  // What an agent swaps the code it was given, or a refresh token, for a token of its own. It arrives as a form.
  @Post('token')
  @HttpCode(200)
  token(@Body() form: Record<string, string> | undefined) {
    return tokenFor(new URLSearchParams(form));
  }

  @Options(['register', 'token'])
  @HttpCode(204)
  preflight() {}
}
