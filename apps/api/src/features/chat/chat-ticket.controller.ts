import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Asking, Caller } from '@/core/decorators/asking.decorator';
import { ForPeople } from '@/core/decorators/for-people.decorator';
import { signChatTicket } from '@/features/auth/core/token';
import { settings } from '@/config/settings';

@ApiTags('Chat')
@ForPeople()
@Controller('chat')
export class ChatTicketController {
  // A pass the realtime server takes for a minute, saying who is joining
  @Get('ticket')
  async ticket(@Asking() { ownerId }: Caller) {
    return { ticket: await signChatTicket(ownerId), url: settings().realtimeUrl };
  }
}
