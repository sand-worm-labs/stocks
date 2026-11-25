import { Column, Entity, PrimaryColumn } from 'typeorm';

// What one person has read or put away of the activity
@Entity('activity_state')
export class ActivityState {
  @PrimaryColumn('uuid', { name: 'user_id' }) userId: string;
  @PrimaryColumn('uuid', { name: 'activity_id' }) activityId: string;
  @Column('timestamptz', { name: 'read_at', nullable: true })
  readAt: Date | null;
  @Column('timestamptz', { name: 'archived_at', nullable: true })
  archivedAt: Date | null;
}
