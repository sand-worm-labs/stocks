import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('text') room: string;
  @Column('uuid', { name: 'user_id' }) userId: string;
  @Column('text') name: string;
  @Column('text') text: string;
  @Column('timestamptz', { default: () => 'now()' }) at: Date;
}
