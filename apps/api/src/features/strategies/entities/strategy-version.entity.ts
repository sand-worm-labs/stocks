import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

import { Json } from '@/common/types/json';
import { numeric } from '@/common/utils/transformers/numeric.transformer';

@Entity('strategy_versions')
export class StrategyVersion {
  @PrimaryColumn('text', { name: 'strategy_id' }) strategyId: string;
  @PrimaryColumn('integer') version: number;
  @Column('jsonb') rules: Json[];
  @Column('jsonb') spec: Json;
  @Column('jsonb') summary: Json[];
  @Column('text', { default: '' }) assumption: string;
  @Column('numeric', { precision: 24, scale: 6, transformer: numeric })
  budget: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
