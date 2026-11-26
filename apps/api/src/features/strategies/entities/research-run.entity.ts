import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

import { Json } from '@/common/types/json';

@Entity('research_runs')
export class ResearchRun {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('text', { name: 'strategy_id' }) strategyId: string;
  @Column('integer') version: number;
  @Column('text') source: 'standin' | 'sandworm';
  @Column('text') status: 'running' | 'ready' | 'failed';
  @Column('timestamptz', { name: 'started_at', default: () => 'now()' })
  startedAt: Date;
  @Column('timestamptz', { name: 'expected_at', nullable: true })
  expectedAt: Date | null;
  @Column('timestamptz', { name: 'finished_at', nullable: true })
  finishedAt: Date | null;
  @Column('text', { nullable: true }) mode: 'timed' | 'waiting' | null;
  @Column('jsonb', { nullable: true }) result: Json | null;
  @Column('text', { nullable: true }) error: string | null;
  @Column('jsonb', { nullable: true }) progress: Json | null;
  @Column('jsonb', { nullable: true }) report: Json | null;
  @Column('jsonb', { nullable: true }) orders: Json[] | null;
}
