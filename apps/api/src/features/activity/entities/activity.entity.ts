import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Json } from '@/common/types/json';
import { numeric } from '@/common/utils/transformers/numeric.transformer';

@Entity('activity')
export class Activity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid', { name: 'user_id' }) userId: string;
  @Column('text', { name: 'strategy_id', nullable: true }) strategyId: string | null;
  @Column('text') kind: string;
  @Column('text') title: string;
  @Column('text', { default: '' }) detail: string;
  @Column('jsonb', { default: () => `'{}'` }) data: Record<string, Json>;
  @Column('bigint', { name: 'ledger_id', nullable: true, transformer: numeric })
  ledgerId: number | null;
  @Column('timestamptz', { default: () => 'now()' }) at: Date;
}
