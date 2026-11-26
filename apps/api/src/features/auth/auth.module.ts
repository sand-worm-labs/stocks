import { Module } from '@nestjs/common';

import { AccountsModule } from '@/features/accounts/accounts.module';

import { AgentApprovalController } from '@/features/auth/mcp-oauth/agent-approval.controller';
import { AgentSignInController } from '@/features/auth/mcp-oauth/agent-sign-in.controller';
import { ChatTicketController } from '@/features/chat/chat-ticket.controller';
import { SandwormSession } from '@/features/auth/sandworm/sandworm-session.service';
import { SessionController } from '@/features/auth/core/session.controller';

@Module({
  imports: [AccountsModule],
  controllers: [SessionController, AgentSignInController, AgentApprovalController, ChatTicketController],
  providers: [SandwormSession],
  exports: [SandwormSession],
})
export class AuthModule {}
