import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { Asking, Caller } from '@/core/decorators/asking.decorator';
import { ForPeople } from '@/core/decorators/for-people.decorator';
import { ZodPipe } from '@/core/pipes/zod.pipe';

import { AgentThread } from './agent-thread.service';

export const MESSAGE_MAX_LENGTH = 1000;

const sayingSchema = z.object({ text: z.string().trim().min(1).max(MESSAGE_MAX_LENGTH) });
const decisionSchema = z.object({ decision: z.enum(['confirm', 'cancel']) });

// The conversation with the agent about one strategy. It belongs to the strategy and to the person who made it, so it is the same wherever
// they open it, and nobody else can read or add to it.
@ApiTags('Agent')
@ForPeople()
@Controller('strategies/:id/agent')
export class AgentController {
  constructor(private readonly thread: AgentThread) {}

  @Get()
  open(@Asking() { ownerId }: Caller, @Param('id') id: string) {
    return this.thread.open(ownerId, id);
  }

  @Post('messages')
  @HttpCode(200)
  say(@Asking() { ownerId }: Caller, @Param('id') id: string, @Body(new ZodPipe(sayingSchema)) saying: z.infer<typeof sayingSchema>) {
    return this.thread.say(ownerId, id, saying.text);
  }

  // Confirms or cancels a step the agent proposed in one of its messages
  @Post('messages/:messageId')
  @HttpCode(200)
  decide(
    @Asking() { ownerId }: Caller,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Body(new ZodPipe(decisionSchema)) body: z.infer<typeof decisionSchema>,
  ) {
    return this.thread.decide(ownerId, id, messageId, body.decision);
  }
}
