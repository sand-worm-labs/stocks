import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

const OPEN = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cache-Control': 'no-store',
};

// The sign-in for agents is called by programs, not by a person's browser on our pages, so its endpoints have no cookie to read and no page
// to have come from: anyone may call them, from any site, and they answer to the standard's own checks (a signed client, a code, a proof key)
@Injectable()
export class OpenToAnySiteGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    void reply.headers(OPEN);
    return true;
  }
}
