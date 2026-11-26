import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

// Who is asking: a person signed in on the app's pages, or their agent with its token. An agent can do what the person can; `isAgent` is
// there for the few things that are done differently for it, such as research that it does itself.
export type Caller = { ownerId: string; isAgent: boolean };

export type CallerRequest = FastifyRequest & { caller?: Caller };

/// The person a `@ForPeople()` route is answering
export const Asking = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const { caller } = context.switchToHttp().getRequest<CallerRequest>();
  return caller;
});
