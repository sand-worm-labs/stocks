import { Column, Entity, PrimaryColumn } from 'typeorm';

import { numeric } from '@/common/utils/transformers/numeric.transformer';

// Everything that happened to a strategy's money, added to and never changed
@Entity('ledger')
export class LedgerEntry {
  @PrimaryColumn('bigint', {
    generated: 'identity',
    generatedIdentity: 'ALWAYS',
    transformer: numeric,
  })
  id: number;
  @Column('text', { name: 'strategy_id' }) strategyId: string;
  @Column('text') kind: 'deposit' | 'withdraw' | 'buy' | 'sell' | 'fee';
  @Column('text', { nullable: true }) symbol: string | null;
  @Column('numeric', {
    precision: 38,
    scale: 18,
    nullable: true,
    transformer: numeric,
  })
  units: number | null;
  @Column('numeric', {
    precision: 24,
    scale: 8,
    nullable: true,
    transformer: numeric,
  })
  price: number | null;
  @Column('numeric', { precision: 24, scale: 6, transformer: numeric })
  usdc: number;
  @Column('numeric', {
    precision: 24,
    scale: 6,
    default: 0,
    transformer: numeric,
  })
  fee: number;
  @Column('numeric', {
    precision: 12,
    scale: 8,
    nullable: true,
    transformer: numeric,
  })
  impact: number | null;
  @Column('text', { name: 'tx_hash', nullable: true }) txHash: string | null;
  @Column('integer', { name: 'chain_id', nullable: true }) chainId: number | null;
  @Column('timestamptz', { default: () => 'now()' }) at: Date;
}
