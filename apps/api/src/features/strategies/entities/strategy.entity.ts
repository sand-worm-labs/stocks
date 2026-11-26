import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('strategies')
export class Strategy {
  @PrimaryColumn('text') id: string;
  @Column('uuid', { name: 'owner_id' }) ownerId: string;
  @Column('text') name: string;
  @Column('text') brief: string;
  @Column('text') status: string;
  @Column('text', { nullable: true }) stage: string | null;
  @Column('text', { nullable: true }) mode: 'paper' | 'wallet' | null;
  @Column('integer', { name: 'current_version', default: 1 })
  currentVersion: number;
  // How many times it has been saved: a save has to name the revision it read
  @Column('integer', { default: 0 }) revision: number;
  @Column('timestamptz', { name: 'created_at' }) createdAt: Date;
  @Column('timestamptz', { name: 'updated_at' }) updatedAt: Date;
  @Column('timestamptz', { name: 'started_at', nullable: true })
  startedAt: Date | null;
  @Column('timestamptz', { name: 'closed_at', nullable: true })
  closedAt: Date | null;
  // When it was put in the trash, or nothing when it isn't there
  @Column('timestamptz', { name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
