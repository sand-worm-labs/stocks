import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { numeric } from '@/common/utils/transformers/numeric.transformer';

// What a person signed to let a strategy trade up to an amount of their own USDC. Their money never comes here.
@Entity('trade_approvals')
export class TradeApproval {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('text', { name: 'strategy_id' }) strategyId: string;
  @Column('text') wallet: string;
  @Column('integer', { name: 'chain_id' }) chainId: number;
  @Column('numeric', {
    name: 'max_amount',
    precision: 24,
    scale: 6,
    transformer: numeric,
  })
  maxAmount: number;
  @Column('text') message: string;
  @Column('text') signature: string;
  @Column('numeric', {
    name: 'balance_seen',
    precision: 24,
    scale: 6,
    transformer: numeric,
  })
  balanceSeen: number;
  @Column('timestamptz', { name: 'expires_at' }) expiresAt: Date;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
