import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

// What is about Stocks for one account of the main Sandworm app, keyed by that account's id
@Entity('profiles')
export class Profile {
  @PrimaryColumn('uuid', { name: 'user_id' }) userId: string;
  @Column('text', { name: 'display_name', nullable: true }) displayName: string | null;
  @Column('text', { nullable: true }) region: string | null;
  @Column('text', { array: true, default: () => `'{}'` }) interests: string[];
  @Column('timestamptz', { name: 'onboarded_at', nullable: true })
  onboardedAt: Date | null;
  @Column('timestamptz', { name: 'welcome_seen_at', nullable: true })
  welcomeSeenAt: Date | null;
  @Column('jsonb', { default: () => `'{}'` }) settings: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
