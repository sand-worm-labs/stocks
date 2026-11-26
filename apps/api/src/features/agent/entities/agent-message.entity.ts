import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import type { AgentBlock, Proposal } from '@/features/agent/types/agent-message.types';

// One message of the conversation about a strategy, from the person or from the agent
@Entity('agent_messages')
export class AgentMessageRow {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('text', { name: 'strategy_id' }) strategyId: string;
  @Column('uuid', { name: 'owner_id' }) ownerId: string;
  @Column('text') author: 'user' | 'agent';
  @Column('jsonb') blocks: AgentBlock[];
  @Column('jsonb', { nullable: true }) proposal: Proposal | null;
  @Column('text', { nullable: true }) milestone: string | null;
  @Column('timestamptz', { name: 'created_at', default: () => 'now()' }) createdAt: Date;
}
